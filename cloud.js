"use strict";

(() => {
  const config = window.APP_CONFIG || {};
  const authGate = document.getElementById("auth-gate");
  const authForm = document.getElementById("auth-form");
  const authEmail = document.getElementById("auth-email");
  const authPassword = document.getElementById("auth-password");
  const authMessage = document.getElementById("auth-message");
  const authError = document.getElementById("auth-error");
  const authSubmit = document.getElementById("auth-submit");
  const logoutButton = document.getElementById("logout-button");
  const dataListeners = new Map();
  const imageUrls = new Map();
  const pendingWrites = new Map();
  const remoteVersions = new Map();
  const remoteRecords = new Map();
  const sharedKeys = [
    "love-shared-dreams",
    "love-dream-balloons",
    "rating:movies",
    "rating:songs",
    "rating:sports",
    "entertainment:movies",
    "entertainment:songs",
    "entertainment:foods",
    "entertainment:sports",
    "image:hero",
    "image:profile:me",
    "image:profile:her",
    ...[1, 2, 3, 4].map((index) => `image:story:${index}`),
    "album:outing",
    "album:cute",
    "album:funny",
    "album:removed-samples",
  ];
  let client;
  let activeUserId = "";
  let channel;
  let deviceId = "";

  function showStatus(message, persistent = false) {
    const status = document.getElementById("image-upload-status");
    if (!status) return;
    status.textContent = message;
    status.hidden = false;
    window.clearTimeout(showStatus.timer);
    if (persistent) return;
    showStatus.timer = window.setTimeout(() => {
      status.hidden = true;
    }, 6000);
  }

  function showAuthError(message) {
    authError.textContent = message;
  }

  function localValue(key) {
    const raw = localStorage.getItem(key);
    if (raw === null) return undefined;
    try {
      return JSON.parse(raw);
    } catch (error) {
      console.error(`Invalid local data for "${key}"`, error);
      return undefined;
    }
  }

  function applyValue(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    dataListeners.get(key)?.forEach((listener) => listener(value));
  }

  function removeValue(key) {
    localStorage.removeItem(key);
    dataListeners.get(key)?.forEach((listener) => listener(undefined));
  }

  function rememberRemote(record) {
    const version = Date.parse(record.updated_at);
    if (version < (remoteVersions.get(record.key) || 0)) return false;
    remoteVersions.set(record.key, version);
    remoteRecords.set(record.key, record);
    return true;
  }

  function applyRemote(record) {
    if (!rememberRemote(record)) return;
    if (!pendingWrites.has(record.key)) applyValue(record.key, record.value);
  }

  function mergeSharedValue(base, desired, remote) {
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const conflict = () => { throw new Error("Mục này vừa được thay đổi trên thiết bị khác. Dữ liệu mới đã được cập nhật; hãy thử lại."); };
    if (same(base, remote) || same(desired, remote)) return desired;
    if (!Array.isArray(desired) || (base !== undefined && !Array.isArray(base)) || !Array.isArray(remote)) return conflict();
    const previous = base || [];
    const identified = [...previous, ...desired, ...remote].every((item) => item && typeof item === "object" && typeof item.id === "string");
    if (identified) {
      const before = new Map(previous.map((item) => [item.id, item]));
      const after = new Map(desired.map((item) => [item.id, item]));
      const result = new Map(remote.map((item) => [item.id, { ...item }]));
      previous.forEach((item) => {
        if (after.has(item.id)) return;
        if (result.has(item.id) && !same(result.get(item.id), item)) conflict();
        result.delete(item.id);
      });
      desired.forEach((item) => {
        const old = before.get(item.id);
        const current = result.get(item.id);
        if (!old) {
          if (current && !same(current, item)) conflict();
          result.set(item.id, item);
        } else if (!current) {
          if (!same(old, item)) conflict();
        } else {
          new Set([...Object.keys(old), ...Object.keys(item)]).forEach((field) => {
            if (same(old[field], item[field])) return;
            if (!same(current[field], old[field]) && !same(current[field], item[field])) conflict();
            if (field in item) current[field] = item[field];
            else delete current[field];
          });
        }
      });
      return [...result.values()];
    }
    // String lists can contain duplicate entries: merge changes by occurrence.
    if (![...previous, ...desired, ...remote].every((item) => typeof item === "string")) return conflict();
    const result = [...remote];
    const counts = (items, value) => items.filter((item) => item === value).length;
    new Set([...previous, ...desired]).forEach((value) => {
      const difference = counts(desired, value) - counts(previous, value);
      for (let index = 0; index < difference; index += 1) result.push(value);
      for (let index = 0; index < -difference; index += 1) {
        const position = result.indexOf(value);
        if (position !== -1) result.splice(position, 1);
      }
    });
    return result;
  }

  async function saveSharedValue(key, base, desired) {
    let latest;
    try {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const { data, error } = await client.from("shared_data")
          .select("key,value,updated_at").eq("key", key).maybeSingle();
        if (error) throw error;
        latest = data;
        if (latest) rememberRemote(latest);
        const value = mergeSharedValue(base, desired, latest?.value);
        const updatedAt = new Date(Math.max(Date.now(), (Date.parse(latest?.updated_at) || 0) + 1)).toISOString();
        if (!latest) {
          const { error: insertError } = await client.from("shared_data").insert({ key, value, updated_at: updatedAt });
          if (insertError?.code === "23505") continue;
          if (insertError) throw insertError;
        } else {
          const { data: changed, error: updateError } = await client.from("shared_data")
            .update({ value, updated_at: updatedAt }).eq("key", key)
            .eq("updated_at", latest.updated_at).select("key");
          if (updateError) throw updateError;
          if (!changed.length) continue;
        }
        rememberRemote({ key, value, updated_at: updatedAt });
        return { saved: true, value, version: Date.parse(updatedAt) };
      }
      throw new Error("Dữ liệu đang được chỉnh sửa đồng thời. Hãy thử lưu lại.");
    } catch (error) {
      try {
        const { data, error: refreshError } = await client.from("shared_data")
          .select("key,value,updated_at").eq("key", key).maybeSingle();
        if (!refreshError) {
          latest = data;
          if (latest) rememberRemote(latest);
        }
      } catch (_) { /* Keep the last known data if the connection is unavailable. */ }
      showStatus(`Không lưu được dữ liệu dùng chung: ${error.message}`);
      return { saved: false, value: latest?.value, hasLatest: latest !== undefined, version: Date.parse(latest?.updated_at) || 0 };
    }
  }

  async function restoreAndMigrateData() {
    const { data: rows, error } = await client.from("shared_data").select("key,value");
    if (error) throw error;

    const remoteKeys = new Set(rows.map((row) => row.key));
    for (const key of sharedKeys) {
      if (remoteKeys.has(key)) continue;
      const value = localValue(key);
      if (value === undefined) continue;

      const { error: insertError } = await client
        .from("shared_data")
        .insert({ key, value });
      if (insertError && insertError.code !== "23505") throw insertError;
    }

    const { data: currentRows, error: refreshError } = await client
      .from("shared_data")
      .select("key,value,updated_at");
    if (refreshError) throw refreshError;
    currentRows.forEach(applyRemote);
  }

  function showApp() {
    authGate.hidden = true;
    logoutButton.hidden = false;
    document.body.classList.remove("auth-open");
    window.dispatchEvent(new CustomEvent("app-cloud-ready"));
  }

  async function activateUser(user) {
    if (activeUserId === user.id) return;
    activeUserId = user.id;
    authSubmit.disabled = true;
    authSubmit.textContent = "Đang đồng bộ...";
    showAuthError("");

    try {
      await restoreAndMigrateData();
      channel = client
        .channel("shared-data-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "shared_data" },
          (payload) => {
            if (payload.eventType === "DELETE") {
              remoteVersions.delete(payload.old.key);
              remoteRecords.delete(payload.old.key);
              if (!pendingWrites.has(payload.old.key)) removeValue(payload.old.key);
            } else if (payload.new) {
              applyRemote(payload.new);
            }
          }
        )
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_events" }, () => {
          window.dispatchEvent(new CustomEvent("app-activity-changed"));
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") window.dispatchEvent(new CustomEvent("app-activity-changed"));
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            showStatus("Mất kết nối đồng bộ trực tiếp. Hãy tải lại trang nếu dữ liệu chưa cập nhật.");
          }
        });
      showApp();
    } catch (error) {
      activeUserId = "";
      showAuthError(`Không thể đồng bộ dữ liệu: ${error.message}`);
    } finally {
      authSubmit.disabled = false;
      authSubmit.textContent = "Đăng nhập";
    }
  }

  function lockApp() {
    activeUserId = "";
    window.dispatchEvent(new CustomEvent("app-cloud-locked"));
    imageUrls.clear();
    if (channel) {
      client.removeChannel(channel);
      channel = null;
    }
    authGate.hidden = false;
    logoutButton.hidden = true;
    document.body.classList.add("auth-open");
    authPassword.value = "";
    authEmail.focus();
  }

  window.appCloud = {
    async notifications(beforeId) {
      if (!client || !activeUserId) throw new Error("Cần đăng nhập để xem thông báo.");
      let query = client.from("activity_events")
        .select("id,key,action,created_at,activity_reads(event_id)")
        .or(`actor_id.neq.${activeUserId},actor_device.neq.${deviceId}`)
        .order("id", { ascending: false }).limit(30);
      if (beforeId) query = query.lt("id", beforeId);
      const [{ data, error }, { data: unread, error: countError }] = await Promise.all([
        query, client.rpc("activity_unread_count"),
      ]);
      if (error || countError) throw error || countError;
      return { items: data.map((item) => ({ ...item, read: item.activity_reads.length > 0 })), unread: Number(unread) };
    },
    async markNotificationsRead() {
      if (!client || !activeUserId) throw new Error("Cần đăng nhập để xem thông báo.");
      const { error } = await client.rpc("mark_activity_read");
      if (error) throw error;
    },
    get isReady() {
      return Boolean(client && activeUserId);
    },
    get(key) {
      return localValue(key);
    },
    set(key, value) {
      const previousRaw = localStorage.getItem(key);
      const base = localValue(key);
      const restorePrevious = () => {
        if (localStorage.getItem(key) !== JSON.stringify(value)) return;
        if (previousRaw === null) {
          removeValue(key);
          return;
        }
        localStorage.setItem(key, previousRaw);
        const previousValue = localValue(key);
        dataListeners.get(key)?.forEach((listener) => listener(previousValue));
      };

      applyValue(key, value);
      if (!client || !activeUserId) {
        showStatus("Bạn cần đăng nhập để lưu thay đổi dùng chung.");
        restorePrevious();
        return Promise.resolve(false);
      }

      const previousWrite = pendingWrites.get(key) || Promise.resolve();
      const operation = previousWrite.then(() => saveSharedValue(key, base, value));
      pendingWrites.set(key, operation);
      return operation.then((result) => {
        if (pendingWrites.get(key) === operation) {
          pendingWrites.delete(key);
          if (result.saved || result.hasLatest) {
            const newer = remoteRecords.get(key);
            const current = newer && Date.parse(newer.updated_at) > result.version ? newer.value : result.value;
            if (current === undefined) removeValue(key);
            else applyValue(key, current);
          } else restorePrevious();
        }
        return result.saved;
      });
    },
    async delete(key) {
      if (!client || !activeUserId) {
        showStatus("Bạn cần đăng nhập để lưu thay đổi dùng chung.");
        return false;
      }
      // Keep a shared deletion marker so stale devices cannot migrate this image back.
      if (key.startsWith("image:")) return window.appCloud.set(key, { deleted: true });
      try {
        const { error } = await client.from("shared_data").delete().eq("key", key);
        if (error) throw error;
        removeValue(key);
        return true;
      } catch (error) {
        showStatus(`Không xóa được dữ liệu: ${error.message}`);
        return false;
      }
    },
    subscribe(key, listener) {
      if (!dataListeners.has(key)) dataListeners.set(key, new Set());
      dataListeners.get(key).add(listener);
      listener(localValue(key));
      return () => dataListeners.get(key)?.delete(listener);
    },
    async uploadImage(path, file) {
      if (!client || !activeUserId) throw new Error("Bạn cần đăng nhập để tải ảnh.");
      const { error } = await client.storage.from("shared-images").upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (error) throw error;
    },
    async imageUrl(path) {
      if (!client || !activeUserId) throw new Error("Bạn cần đăng nhập để xem ảnh.");
      const cached = imageUrls.get(path);
      if (cached && cached.expiresAt > Date.now()) return cached.promise;

      const entry = { expiresAt: Date.now() + 50 * 60 * 1000 };
      entry.promise = client.storage
        .from("shared-images")
        .createSignedUrl(path, 3600)
        .then(({ data, error }) => {
          if (error) throw error;
          entry.url = data.signedUrl;
          return data.signedUrl;
        })
        .catch((error) => {
          if (imageUrls.get(path) === entry) imageUrls.delete(path);
          throw error;
        });
      imageUrls.set(path, entry);
      return entry.promise;
    },
    isImageUrlCurrent(path, url) {
      const entry = imageUrls.get(path);
      return Boolean(entry && entry.expiresAt > Date.now() && entry.url === url);
    },
    async deleteImages(paths) {
      if (!client || !activeUserId) throw new Error("Bạn cần đăng nhập để xóa ảnh.");
      if (!paths.length) return;
      const { error } = await client.storage.from("shared-images").remove(paths);
      if (error) throw error;
      paths.forEach((path) => imageUrls.delete(path));
    },
    showStatus,
  };

  async function initialize() {
    document.body.classList.add("auth-open");
    authEmail.focus();
    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      authMessage.textContent = "Cần cấu hình Supabase trong config.js để mở trang.";
      authSubmit.disabled = true;
      return;
    }
    if (!window.supabase?.createClient) {
      authMessage.textContent = "Không tải được thư viện Supabase. Hãy kiểm tra kết nối mạng.";
      authSubmit.disabled = true;
      return;
    }

    deviceId = localStorage.getItem("app:device-id");
    if (!/^[a-f0-9-]{36}$/i.test(deviceId || "")) {
      deviceId = window.crypto.randomUUID();
      localStorage.setItem("app:device-id", deviceId);
    }
    client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
      global: { headers: { "x-app-device": deviceId } },
    });
    client.auth.onAuthStateChange((event, session) => {
      window.setTimeout(() => {
        if (session?.user) {
          activateUser(session.user);
        } else if (event === "SIGNED_OUT") {
          lockApp();
        }
      }, 0);
    });

    const { data, error } = await client.auth.getSession();
    if (error) {
      showAuthError(`Không thể kiểm tra phiên đăng nhập: ${error.message}`);
      return;
    }
    if (data.session?.user) {
      await activateUser(data.session.user);
    } else {
      lockApp();
    }
  }

  authForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!client) return;
    authSubmit.disabled = true;
    authSubmit.textContent = "Đang đăng nhập...";
    showAuthError("");

    try {
      const { error } = await client.auth.signInWithPassword({
        email: authEmail.value.trim(),
        password: authPassword.value,
      });
      if (error) throw error;
      authPassword.value = "";
    } catch (error) {
      showAuthError(`Đăng nhập thất bại: ${error.message}`);
      authSubmit.disabled = false;
      authSubmit.textContent = "Đăng nhập";
    }
  });

  authGate.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      authEmail.focus();
    } else if (event.key === "Tab") {
      event.preventDefault();
      const focusable = [authEmail, authPassword, authSubmit].filter((element) => !element.disabled);
      const currentIndex = focusable.indexOf(document.activeElement);
      const offset = event.shiftKey ? -1 : 1;
      focusable[(currentIndex + offset + focusable.length) % focusable.length].focus();
    }
  });

  logoutButton.addEventListener("click", async () => {
    if (!client) return;
    const { error } = await client.auth.signOut();
    if (error) showStatus(`Không thể đăng xuất: ${error.message}`);
  });

  initialize().catch((error) => {
    showAuthError(`Không thể khởi tạo đăng nhập: ${error.message}`);
  });
})();
