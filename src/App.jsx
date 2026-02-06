import { useEffect, useMemo, useRef, useState } from "react";
import { toDataURL } from "qrcode";
import { apiRequest } from "./api.js";

const fallbackListings = [
  {
    title: "Численные методы: лаба 3",
    author: "Виктория М.",
    price: 490,
    rating: "4.9",
    tags: ["Matlab", "Отчет", "Графики"],
    category: "Лабораторные",
    description:
      "Отчет, выводы и готовые графики. Подойдет для сдачи и защиты.",
  },
  {
    title: "Сети: практическое задание 2",
    author: "Артур К.",
    price: 350,
    rating: "4.8",
    tags: ["Cisco", "Топология", "Wireshark"],
    category: "Практика",
    description:
      "Настроенная топология, скриншоты и пояснения по командам.",
  },
  {
    title: "ОС: лекции 1-6",
    author: "София Р.",
    price: 900,
    rating: "5.0",
    tags: ["Конспект", "Схемы", "Экзамен"],
    category: "Лекции",
    description:
      "Собрано в одном PDF: схемы, определения, таблицы и краткие выводы.",
  },
  {
    title: "Базы данных: лаба 5",
    author: "Илья Н.",
    price: 520,
    rating: "4.7",
    tags: ["SQL", "ERD", "Отчет"],
    category: "Лабораторные",
    description:
      "ERD, SQL-запросы, финальный отчет и чек-лист преподавателя.",
  },
  {
    title: "Алгоритмы: практика 4",
    author: "Лев С.",
    price: 410,
    rating: "4.8",
    tags: ["C++", "Сложность", "Тесты"],
    category: "Практика",
    description:
      "Решения с оценкой сложности, тесты и объяснение ключевых шагов.",
  },
  {
    title: "Физика: лаба по оптике",
    author: "Аделина П.",
    price: 440,
    rating: "4.9",
    tags: ["Эксперимент", "Формулы", "PDF"],
    category: "Лабораторные",
    description:
      "Описание эксперимента, формулы, расчеты и аккуратный отчет.",
  },
];

const categories = [
  {
    title: "Лабораторные",
    subtitle: "Полные отчеты, модели, оформленные таблицы.",
  },
  {
    title: "Практика",
    subtitle: "Решения задач с разбором и пояснениями.",
  },
  {
    title: "Лекции",
    subtitle: "Конспекты, схемы и подготовка к экзамену.",
  },
  {
    title: "Проекты",
    subtitle: "Курсовые, мини-сервисы и презентации.",
  },
];

const steps = [
  {
    title: "Загрузите работу",
    text: "Добавьте файл, описание и ключевые темы.",
  },
  {
    title: "Пройдите модерацию",
    text: "Мы проверим формат и качество перед публикацией.",
  },
  {
    title: "Получайте продажи",
    text: "Безопасные сделки и быстрые выплаты.",
  },
];

const listingCategories = [
  "Лабораторные",
  "Практика",
  "Лекции",
  "Проекты",
  "Экзамены",
];

const statusMap = {
  pending: "На модерации",
  approved: "Одобрено",
  rejected: "Отклонено",
  draft: "Черновик",
  active: "Активен",
  blocked: "Заблокирован",
};

const orderStatusMap = {
  pending_payment: "Ожидает оплаты",
  escrow: "На удержании",
  released: "Завершено",
  cancelled: "Отменено",
};

const paymentStatusMap = {
  pending: "Ожидает оплаты",
  paid: "Оплачено",
  failed: "Ошибка оплаты",
  cancelled: "Отменено",
};

const disputeStatusMap = {
  open: "Открыт",
  resolved: "Решен",
  cancelled: "Отменен",
};

const disputeResolutionMap = {
  refund: "Возврат покупателю",
  release: "Выдача продавцу",
};

const refundStatusMap = {
  pending: "Возврат в обработке",
  succeeded: "Возврат выполнен",
  failed: "Возврат не удался",
  cancelled: "Возврат отменен",
};

function PaymentQr({ payload }) {
  const [dataUrl, setDataUrl] = useState("");

  useEffect(() => {
    let active = true;
    if (!payload) {
      setDataUrl("");
      return undefined;
    }
    toDataURL(payload, { width: 220, margin: 1 })
      .then((url) => {
        if (active) setDataUrl(url);
      })
      .catch(() => {
        if (active) setDataUrl("");
      });
    return () => {
      active = false;
    };
  }, [payload]);

  if (!payload) return null;
  if (!dataUrl) {
    return <span className="form-hint">Готовим QR-код...</span>;
  }
  return <img className="payment-qr" src={dataUrl} alt="QR для оплаты" />;
}

export default function App() {
  const tokenKey = "castlelab_token";
  const favoritesKey = "castlelab_favorites";
  const [token, setToken] = useState(() => localStorage.getItem(tokenKey));
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authError, setAuthError] = useState("");
  const [authInfo, setAuthInfo] = useState("");
  const [listingsError, setListingsError] = useState("");
  const [createError, setCreateError] = useState("");
  const [createInfo, setCreateInfo] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileInfo, setProfileInfo] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordInfo, setPasswordInfo] = useState("");
  const [publicListings, setPublicListings] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    email: "",
    login: "",
    password: "",
  });
  const [loginForm, setLoginForm] = useState({
    login: "",
    password: "",
  });
  const [listingForm, setListingForm] = useState({
    title: "",
    description: "",
    price: "",
    category: listingCategories[0],
  });
  const [profileForm, setProfileForm] = useState({
    displayName: "",
    bio: "",
    university: "",
    faculty: "",
    city: "",
    avatarUrl: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [favorites, setFavorites] = useState(() => {
    try {
      const stored = localStorage.getItem(favoritesKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [selectedListing, setSelectedListing] = useState(null);
  const [profileLookup, setProfileLookup] = useState("");
  const [profileLookupError, setProfileLookupError] = useState("");
  const [profileLookupInfo, setProfileLookupInfo] = useState("");
  const [profileLookupLoading, setProfileLookupLoading] = useState(false);
  const [publicProfile, setPublicProfile] = useState(null);
  const [publicProfileListings, setPublicProfileListings] = useState([]);
  const [listingQuery, setListingQuery] = useState("");
  const [listingCategory, setListingCategory] = useState("Все");
  const [listingSort, setListingSort] = useState("default");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [adminView, setAdminView] = useState("moderation");
  const [pendingListings, setPendingListings] = useState([]);
  const [approvedListings, setApprovedListings] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminError, setAdminError] = useState("");
  const [adminInfo, setAdminInfo] = useState("");
  const [moderationNotes, setModerationNotes] = useState({});
  const [editListingId, setEditListingId] = useState(null);
  const [editListingForm, setEditListingForm] = useState({
    title: "",
    description: "",
    price: "",
    category: listingCategories[0],
  });
  const [wallet, setWallet] = useState(null);
  const [walletError, setWalletError] = useState("");
  const [orders, setOrders] = useState([]);
  const [sales, setSales] = useState([]);
  const [ordersError, setOrdersError] = useState("");
  const [ordersInfo, setOrdersInfo] = useState("");
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [disputeDrafts, setDisputeDrafts] = useState({});
  const [adminDisputes, setAdminDisputes] = useState([]);
  const [adminDisputeNotes, setAdminDisputeNotes] = useState({});
  const [chatOpen, setChatOpen] = useState({});
  const [orderMessages, setOrderMessages] = useState({});
  const [messageDrafts, setMessageDrafts] = useState({});
  const [chatBusy, setChatBusy] = useState({});
  const [chatErrors, setChatErrors] = useState({});
  const chatPollInFlightRef = useRef(new Set());
  const dealsPollInFlightRef = useRef(false);

  const handleFieldChange = (setter) => (event) => {
    const { name, value } = event.target;
    setter((prev) => ({ ...prev, [name]: value }));
  };

  const persistToken = (nextToken) => {
    if (nextToken) {
      localStorage.setItem(tokenKey, nextToken);
      setToken(nextToken);
      return;
    }
    localStorage.removeItem(tokenKey);
    setToken(null);
  };

  const formatPrice = (value) => {
    if (typeof value === "number") {
      return `${value.toLocaleString("ru-RU")} ₽`;
    }
    return value || "—";
  };

  const formatDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getInitials = (label) => {
    if (!label) return "CL";
    return label
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  };

  const parsePrice = (value) => {
    if (typeof value === "number") return value;
    const numeric = Number(
      String(value || "")
        .replace(/[^0-9.,]/g, "")
        .replace(",", ".")
    );
    return Number.isFinite(numeric) ? numeric : 0;
  };

  const getListingKey = (item) => String(item.id || item.title || "");

  const toggleFavorite = (listingKey) => {
    if (!listingKey) return;
    setFavorites((prev) =>
      prev.includes(listingKey)
        ? prev.filter((key) => key !== listingKey)
        : [...prev, listingKey]
    );
  };

  const openListing = (listing) => {
    setSelectedListing(listing);
  };

  const closeListing = () => {
    setSelectedListing(null);
  };

  const getRouteFromHash = () => {
    const hash = window.location.hash || "";
    const cleaned = hash.replace(/^#/, "").trim();
    if (!cleaned) return "/";
    const withSlash = cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
    const normalized = withSlash.replace(/\/+$/, "");
    return normalized || "/";
  };

  const [route, setRoute] = useState(() => getRouteFromHash());

  const navigate = (nextRoute) => {
    const path = nextRoute.startsWith("/") ? nextRoute : `/${nextRoute}`;
    if (path === route) return;
    window.location.hash = path;
  };

  const loadListings = async (activeToken) => {
    setIsLoading(true);
    setListingsError("");
    try {
      const publicData = await apiRequest("/api/listings");
      setPublicListings(publicData.listings || []);
      if (activeToken) {
        const myData = await apiRequest("/api/listings?mine=true", {
          token: activeToken,
        });
        setMyListings(myData.listings || []);
      } else {
        setMyListings([]);
      }
    } catch (error) {
      setListingsError(error.message);
      setPublicListings([]);
      setMyListings([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProfile = async (activeToken) => {
    if (!activeToken) {
      setProfile(null);
      return;
    }
    setProfileError("");
    try {
      const data = await apiRequest("/api/profiles/me", { token: activeToken });
      setProfile(data.profile);
    } catch (error) {
      setProfileError(error.message);
      setProfile(null);
    }
  };

  const loadAdminData = async (activeToken, role) => {
    if (!activeToken || !role) {
      setPendingListings([]);
      setApprovedListings([]);
      setAdminUsers([]);
      setAdminDisputes([]);
      return;
    }
    if (role !== "admin" && role !== "moderator") {
      setPendingListings([]);
      setApprovedListings([]);
      setAdminUsers([]);
      setAdminDisputes([]);
      return;
    }
    setAdminError("");
    try {
      const pendingData = await apiRequest("/api/listings?status=pending", {
        token: activeToken,
      });
      setPendingListings(pendingData.listings || []);
      const approvedData = await apiRequest("/api/listings?status=approved", {
        token: activeToken,
      });
      setApprovedListings(approvedData.listings || []);
      const disputesData = await apiRequest("/api/admin/disputes?status=open", {
        token: activeToken,
      });
      setAdminDisputes(disputesData.disputes || []);
      if (role === "admin") {
        const usersData = await apiRequest("/api/admin/users", {
          token: activeToken,
        });
        setAdminUsers(usersData.users || []);
      } else {
        setAdminUsers([]);
      }
    } catch (error) {
      setAdminError(error.message);
    }
  };

  const loadWallet = async (activeToken) => {
    if (!activeToken) {
      setWallet(null);
      return;
    }
    setWalletError("");
    try {
      const data = await apiRequest("/api/wallets/me", { token: activeToken });
      setWallet(data.wallet);
    } catch (error) {
      setWalletError(error.message);
      setWallet(null);
    }
  };

  const loadOrders = async (activeToken) => {
    if (!activeToken) {
      setOrders([]);
      setSales([]);
      return;
    }
    setOrdersError("");
    try {
      const buyerData = await apiRequest("/api/orders?role=buyer", {
        token: activeToken,
      });
      const sellerData = await apiRequest("/api/orders?role=seller", {
        token: activeToken,
      });
      setOrders(buyerData.orders || []);
      setSales(sellerData.orders || []);
    } catch (error) {
      setOrdersError(error.message);
      setOrders([]);
      setSales([]);
    }
  };

  useEffect(() => {
    loadListings(token);
  }, [token]);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setProfile(null);
      return;
    }
    apiRequest("/api/auth/me", { token })
      .then((data) => {
        setUser(data.user);
      })
      .catch(() => {
        persistToken(null);
      });
  }, [token]);

  useEffect(() => {
    loadProfile(token);
  }, [token]);

  useEffect(() => {
    loadAdminData(token, user?.role);
  }, [token, user?.role]);

  useEffect(() => {
    loadWallet(token);
    loadOrders(token);
  }, [token]);

  useEffect(() => {
    if (token) return;
    setChatOpen({});
    setOrderMessages({});
    setMessageDrafts({});
    setChatBusy({});
    setChatErrors({});
  }, [token]);

  useEffect(() => {
    if (!token || route !== "/deals") return;
    pollDeals();
    const intervalId = setInterval(() => {
      pollDeals();
    }, 10000);
    return () => clearInterval(intervalId);
  }, [token, route]);

  useEffect(() => {
    if (!token || route !== "/deals") return;
    const openIds = Object.keys(chatOpen).filter((key) => chatOpen[key]);
    if (!openIds.length) return;
    const intervalId = setInterval(() => {
      openIds.forEach((id) => pollChatMessages(Number(id)));
    }, 4000);
    return () => clearInterval(intervalId);
  }, [token, route, chatOpen]);

  useEffect(() => {
    if (!profile) {
      setProfileForm((prev) => ({
        ...prev,
        displayName: user?.login || "",
      }));
      return;
    }
    setProfileForm({
      displayName: profile.displayName || "",
      bio: profile.bio || "",
      university: profile.university || "",
      faculty: profile.faculty || "",
      city: profile.city || "",
      avatarUrl: profile.avatarUrl || "",
    });
  }, [profile, user]);

  useEffect(() => {
    localStorage.setItem(favoritesKey, JSON.stringify(favorites));
  }, [favorites, favoritesKey]);

  useEffect(() => {
    if (showFavoritesOnly && favorites.length === 0) {
      setShowFavoritesOnly(false);
    }
  }, [favorites, showFavoritesOnly]);

  useEffect(() => {
    if (!selectedListing) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setSelectedListing(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedListing]);

  useEffect(() => {
    const handleHashChange = () => setRoute(getRouteFromHash());
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    setSelectedListing(null);
    window.scrollTo(0, 0);
  }, [route]);

  const handleRegister = async (event) => {
    event.preventDefault();
    setAuthError("");
    setAuthInfo("");
    try {
      const data = await apiRequest("/api/auth/register", {
        method: "POST",
        body: registerForm,
      });
      persistToken(data.token);
      setUser(data.user);
      setRegisterForm({ email: "", login: "", password: "" });
      setAuthInfo("Регистрация успешна. Добро пожаловать!");
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setAuthError("");
    setAuthInfo("");
    try {
      const data = await apiRequest("/api/auth/login", {
        method: "POST",
        body: loginForm,
      });
      persistToken(data.token);
      setUser(data.user);
      setLoginForm({ login: "", password: "" });
      setAuthInfo("Вы вошли в систему.");
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const handleLogout = () => {
    persistToken(null);
    setUser(null);
    setProfile(null);
    setAuthError("");
    setAuthInfo("");
  };

  const handleCreateListing = async (event) => {
    event.preventDefault();
    setCreateError("");
    setCreateInfo("");
    try {
      await apiRequest("/api/listings", {
        method: "POST",
        body: listingForm,
        token,
      });
      setListingForm({
        title: "",
        description: "",
        price: "",
        category: listingCategories[0],
      });
      setCreateInfo("Объявление отправлено на модерацию.");
      await loadListings(token);
      await loadAdminData(token, user?.role);
    } catch (error) {
      setCreateError(error.message);
    }
  };

  const handleProfileUpdate = async (event) => {
    event.preventDefault();
    setProfileError("");
    setProfileInfo("");
    try {
      const data = await apiRequest("/api/profiles/me", {
        method: "PATCH",
        body: profileForm,
        token,
      });
      setProfile(data.profile);
      setProfileInfo("Профиль обновлен.");
    } catch (error) {
      setProfileError(error.message);
    }
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    setPasswordError("");
    setPasswordInfo("");
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("Пароли не совпадают.");
      return;
    }
    try {
      await apiRequest("/api/auth/password", {
        method: "PATCH",
        body: {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        },
        token,
      });
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordInfo("Пароль обновлен.");
    } catch (error) {
      setPasswordError(error.message);
    }
  };

  const fetchPublicProfile = async (login) => {
    const safeLogin = String(login || "").trim();
    if (!safeLogin) return;
    setProfileLookupLoading(true);
    setProfileLookupError("");
    setProfileLookupInfo("");
    try {
      const profileData = await apiRequest(
        `/api/profiles/${encodeURIComponent(safeLogin)}`
      );
      const listingsData = await apiRequest(
        `/api/listings?author=${encodeURIComponent(safeLogin)}`
      );
      setPublicProfile(profileData.profile);
      setPublicProfileListings(listingsData.listings || []);
      if (!listingsData.listings || !listingsData.listings.length) {
        setProfileLookupInfo("У автора пока нет опубликованных работ.");
      }
    } catch (error) {
      setPublicProfile(null);
      setPublicProfileListings([]);
      setProfileLookupError(error.message);
    } finally {
      setProfileLookupLoading(false);
    }
  };

  const handleProfileLookup = async (event) => {
    event.preventDefault();
    const safeLogin = profileLookup.trim();
    if (!safeLogin) {
      setProfileLookupError("Введите никнейм автора.");
      setPublicProfile(null);
      setPublicProfileListings([]);
      return;
    }
    await fetchPublicProfile(safeLogin);
  };

  const handleProfileQuickView = (login) => {
    if (!login) return;
    setProfileLookup(login);
    fetchPublicProfile(login);
    navigate("/authors");
  };

  const handleModerationNoteChange = (listingId, value) => {
    setModerationNotes((prev) => ({ ...prev, [listingId]: value }));
  };

  const handleModerateListing = async (listingId, status) => {
    setAdminError("");
    setAdminInfo("");
    try {
      await apiRequest(`/api/listings/${listingId}/moderate`, {
        method: "POST",
        body: {
          status,
          notes: moderationNotes[listingId] || "",
        },
        token,
      });
      setAdminInfo(
        status === "approved"
          ? "Объявление одобрено."
          : "Объявление отклонено."
      );
      await loadAdminData(token, user?.role);
      await loadListings(token);
    } catch (error) {
      setAdminError(error.message);
    }
  };

  const handleEditListingStart = (listing) => {
    setEditListingId(listing.id);
    setEditListingForm({
      title: listing.title || "",
      description: listing.description || "",
      price: listing.price ? String(listing.price) : "",
      category: listing.category || listingCategories[0],
    });
  };

  const handleEditListingCancel = () => {
    setEditListingId(null);
  };

  const handleEditListingSubmit = async (event) => {
    event.preventDefault();
    if (!editListingId) return;
    setAdminError("");
    setAdminInfo("");
    try {
      await apiRequest(`/api/listings/${editListingId}`, {
        method: "PATCH",
        body: editListingForm,
        token,
      });
      setEditListingId(null);
      setAdminInfo("Объявление обновлено.");
      await loadAdminData(token, user?.role);
      await loadListings(token);
    } catch (error) {
      setAdminError(error.message);
    }
  };

  const handleUserRoleChange = async (userId, role) => {
    setAdminError("");
    setAdminInfo("");
    try {
      await apiRequest(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        body: { role },
        token,
      });
      setAdminInfo("Роль пользователя обновлена.");
      await loadAdminData(token, user?.role);
    } catch (error) {
      setAdminError(error.message);
    }
  };

  const handleUserStatusChange = async (userId, status) => {
    setAdminError("");
    setAdminInfo("");
    try {
      await apiRequest(`/api/admin/users/${userId}/status`, {
        method: "PATCH",
        body: { status },
        token,
      });
      setAdminInfo("Статус пользователя обновлен.");
      await loadAdminData(token, user?.role);
    } catch (error) {
      setAdminError(error.message);
    }
  };

  const refreshDeals = async () => {
    await loadOrders(token);
    await loadWallet(token);
  };

  const pollDeals = async () => {
    if (dealsPollInFlightRef.current) return;
    dealsPollInFlightRef.current = true;
    try {
      await refreshDeals();
    } finally {
      dealsPollInFlightRef.current = false;
    }
  };

  const handleToggleChat = async (orderId) => {
    if (!orderId || !token) return;
    const nextOpen = !chatOpen[orderId];
    setChatOpen((prev) => ({ ...prev, [orderId]: nextOpen }));
    if (nextOpen && !orderMessages[orderId]) {
      await loadChatMessages(orderId);
    }
  };

  const loadChatMessages = async (orderId, { silent = false } = {}) => {
    if (!orderId || !token) return;
    if (!silent) {
      setChatErrors((prev) => ({ ...prev, [orderId]: "" }));
      setChatBusy((prev) => ({ ...prev, [orderId]: true }));
    }
    try {
      const data = await apiRequest(`/api/orders/${orderId}/messages`, {
        token,
      });
      setOrderMessages((prev) => ({ ...prev, [orderId]: data.messages || [] }));
    } catch (error) {
      if (!silent) {
        setChatErrors((prev) => ({ ...prev, [orderId]: error.message }));
      }
    } finally {
      if (!silent) {
        setChatBusy((prev) => ({ ...prev, [orderId]: false }));
      }
    }
  };

  const pollChatMessages = async (orderId) => {
    if (!orderId || !token) return;
    if (chatPollInFlightRef.current.has(orderId)) return;
    chatPollInFlightRef.current.add(orderId);
    try {
      await loadChatMessages(orderId, { silent: true });
    } finally {
      chatPollInFlightRef.current.delete(orderId);
    }
  };

  const handleChatDraftChange = (orderId, value) => {
    setMessageDrafts((prev) => ({ ...prev, [orderId]: value }));
  };

  const handleSendChatMessage = async (orderId) => {
    if (!orderId || !token) return;
    const message = String(messageDrafts[orderId] || "").trim();
    if (!message) return;
    setChatErrors((prev) => ({ ...prev, [orderId]: "" }));
    setChatBusy((prev) => ({ ...prev, [orderId]: true }));
    try {
      const data = await apiRequest(`/api/orders/${orderId}/messages`, {
        method: "POST",
        token,
        body: { message },
      });
      setOrderMessages((prev) => ({
        ...prev,
        [orderId]: [...(prev[orderId] || []), data.message].filter(Boolean),
      }));
      setMessageDrafts((prev) => ({ ...prev, [orderId]: "" }));
    } catch (error) {
      setChatErrors((prev) => ({ ...prev, [orderId]: error.message }));
    } finally {
      setChatBusy((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const renderOrderChat = (order) => {
    if (!order?.id) return null;
    const messages = orderMessages[order.id] || [];
    const isOpen = Boolean(chatOpen[order.id]);
    const isBusy = Boolean(chatBusy[order.id]);
    const error = chatErrors[order.id] || "";

    return (
      <div className="deal-chat">
        <button
          className="ghost"
          type="button"
          onClick={() => handleToggleChat(order.id)}
        >
          {isOpen ? "Скрыть чат" : "Открыть чат"}
        </button>
        {isOpen ? (
          <div className="chat-panel">
            <div className="chat-messages">
              {messages.length ? (
                messages.map((message) => {
                  const isSelf = message.sender?.id === user?.id;
                  return (
                    <div
                      key={message.id}
                      className={`chat-message ${isSelf ? "self" : ""}`}
                    >
                      <div className="chat-bubble">
                        <div className="chat-meta">
                          <span className="chat-author">
                            @{message.sender?.login || "user"}
                          </span>
                          <span className="chat-time">
                            {formatDateTime(message.createdAt)}
                          </span>
                        </div>
                        <p>{message.message}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="form-hint">Сообщений пока нет.</p>
              )}
            </div>
            {error ? <p className="form-error">{error}</p> : null}
            <div className="chat-input">
              <textarea
                rows={2}
                placeholder="Напишите сообщение"
                value={messageDrafts[order.id] || ""}
                onChange={(event) =>
                  handleChatDraftChange(order.id, event.target.value)
                }
              />
              <button
                className="primary"
                type="button"
                onClick={() => handleSendChatMessage(order.id)}
                disabled={isBusy}
              >
                Отправить
              </button>
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  const handleStartSbpPaymentForListing = async (listingId) => {
    if (!listingId || !token) return;
    setOrdersError("");
    setOrdersInfo("");
    setPaymentBusy(true);
    try {
      const created = await apiRequest("/api/orders", {
        method: "POST",
        body: { listingId },
        token,
      });
      const orderId = created.order?.id;
      if (orderId) {
        await apiRequest(`/api/orders/${orderId}/sbp`, {
          method: "POST",
          token,
        });
      }
      setOrdersInfo("Счет СБП создан. Подтвердите оплату.");
      await refreshDeals();
    } catch (error) {
      setOrdersError(error.message);
    } finally {
      setPaymentBusy(false);
    }
  };

  const handleStartSbpPaymentForOrder = async (orderId) => {
    if (!orderId || !token) return;
    setOrdersError("");
    setOrdersInfo("");
    setPaymentBusy(true);
    try {
      await apiRequest(`/api/orders/${orderId}/sbp`, {
        method: "POST",
        token,
      });
      setOrdersInfo("Счет СБП создан. Подтвердите оплату.");
      await refreshDeals();
    } catch (error) {
      setOrdersError(error.message);
    } finally {
      setPaymentBusy(false);
    }
  };

  const handleConfirmSbpPayment = async (orderId) => {
    if (!orderId || !token) return;
    setOrdersError("");
    setOrdersInfo("");
    setPaymentBusy(true);
    try {
      await apiRequest(`/api/orders/${orderId}/sbp/confirm`, {
        method: "POST",
        token,
      });
      setOrdersInfo("Оплата подтверждена. Деньги удерживаются на кошельке.");
      await refreshDeals();
    } catch (error) {
      setOrdersError(error.message);
    } finally {
      setPaymentBusy(false);
    }
  };

  const handleConfirmOrder = async (orderId) => {
    if (!orderId || !token) return;
    setOrdersError("");
    setOrdersInfo("");
    setPaymentBusy(true);
    try {
      await apiRequest(`/api/orders/${orderId}/confirm`, {
        method: "POST",
        token,
      });
      setOrdersInfo("Заказ подтвержден. Деньги отправлены продавцу.");
      await refreshDeals();
    } catch (error) {
      setOrdersError(error.message);
    } finally {
      setPaymentBusy(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!orderId || !token) return;
    setOrdersError("");
    setOrdersInfo("");
    setPaymentBusy(true);
    try {
      await apiRequest(`/api/orders/${orderId}/cancel`, {
        method: "POST",
        token,
      });
      setOrdersInfo("Заказ отменен.");
      await refreshDeals();
    } catch (error) {
      setOrdersError(error.message);
    } finally {
      setPaymentBusy(false);
    }
  };

  const handleDisputeDraftChange = (orderId, value) => {
    setDisputeDrafts((prev) => ({ ...prev, [orderId]: value }));
  };

  const handleOpenDispute = async (orderId) => {
    if (!orderId || !token) return;
    setOrdersError("");
    setOrdersInfo("");
    setPaymentBusy(true);
    try {
      await apiRequest(`/api/orders/${orderId}/dispute`, {
        method: "POST",
        body: {
          reason: disputeDrafts[orderId] || "",
        },
        token,
      });
      setOrdersInfo("Спор открыт. Ожидайте решения.");
      setDisputeDrafts((prev) => ({ ...prev, [orderId]: "" }));
      await refreshDeals();
      await loadAdminData(token, user?.role);
    } catch (error) {
      setOrdersError(error.message);
    } finally {
      setPaymentBusy(false);
    }
  };

  const handleAdminDisputeNoteChange = (disputeId, value) => {
    setAdminDisputeNotes((prev) => ({ ...prev, [disputeId]: value }));
  };

  const handleResolveDispute = async (disputeId, resolution) => {
    if (!disputeId || !token) return;
    setAdminError("");
    setAdminInfo("");
    setPaymentBusy(true);
    try {
      await apiRequest(`/api/admin/disputes/${disputeId}/resolve`, {
        method: "POST",
        body: {
          resolution,
          notes: adminDisputeNotes[disputeId] || "",
        },
        token,
      });
      setAdminInfo("Спор обработан.");
      await loadAdminData(token, user?.role);
      await refreshDeals();
    } catch (error) {
      setAdminError(error.message);
    } finally {
      setPaymentBusy(false);
    }
  };

  const showDemoListings = !publicListings.length;
  const publicListingsData = showDemoListings
    ? fallbackListings
    : publicListings;

  const filteredListings = useMemo(() => {
    let data = [...publicListingsData];
    const query = listingQuery.trim().toLowerCase();
    if (query) {
      data = data.filter((item) => {
        const haystack = [
          item.title,
          item.author,
          item.description,
          item.category,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      });
    }
    if (listingCategory !== "Все") {
      data = data.filter((item) => item.category === listingCategory);
    }
    if (showFavoritesOnly) {
      data = data.filter((item) => favorites.includes(getListingKey(item)));
    }
    if (listingSort === "price-asc") {
      data.sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
    }
    if (listingSort === "price-desc") {
      data.sort((a, b) => parsePrice(b.price) - parsePrice(a.price));
    }
    return data;
  }, [
    publicListingsData,
    listingQuery,
    listingCategory,
    listingSort,
    showFavoritesOnly,
    favorites,
  ]);

  const profileLabel = profile?.displayName || user?.login || "";
  const profileInitials = getInitials(profileLabel);
  const publicProfileLabel =
    publicProfile?.displayName || publicProfile?.login || "";
  const publicProfileInitials = getInitials(publicProfileLabel);
  const selectedListingKey = selectedListing
    ? getListingKey(selectedListing)
    : "";
  const selectedListingFavorite =
    selectedListingKey && favorites.includes(selectedListingKey);
  const selectedListingOrder = useMemo(() => {
    if (!selectedListing?.id) return null;
    return (
      orders.find(
        (order) =>
          order.listing?.id === selectedListing.id &&
          !["released", "cancelled"].includes(order.status)
      ) || null
    );
  }, [orders, selectedListing]);
  const isSelectedListingOwner =
    user && selectedListing?.author && user.login === selectedListing.author;
  const canPurchaseSelectedListing =
    user && selectedListing?.id && !isSelectedListingOwner;

  return (
    <div className="page">
      {route !== "/" ? (
        <header className="site-header">
          <nav className="nav">
            <div className="logo">
              <span className="logo-mark">CL</span>
              <span className="logo-text">CastleLab Market</span>
            </div>
            <div className="nav-actions">
              <a className={`ghost ${route === "/" ? "active" : ""}`} href="#/">
                Главная
              </a>
              <a
                className={`ghost ${route === "/catalog" ? "active" : ""}`}
                href="#/catalog"
              >
                Каталог
              </a>
              <a
                className={`ghost ${route === "/authors" ? "active" : ""}`}
                href="#/authors"
              >
                Авторы
              </a>
              {user ? (
                <a
                  className={`ghost ${
                    route === "/my-listings" ? "active" : ""
                  }`}
                  href="#/my-listings"
                >
                  Мои объявления
                </a>
              ) : (
                <a
                  className={`ghost ${route === "/auth" ? "active" : ""}`}
                  href="#/auth"
                >
                  Войти
                </a>
              )}
              {user ? (
                <a
                  className={`ghost ${route === "/profile" ? "active" : ""}`}
                  href="#/profile"
                >
                  Профиль
                </a>
              ) : null}
              {user ? (
                <a
                  className={`ghost ${route === "/deals" ? "active" : ""}`}
                  href="#/deals"
                >
                  Сделки
                </a>
              ) : null}
              {user && (user.role === "admin" || user.role === "moderator") ? (
                <a
                  className={`ghost ${route === "/admin" ? "active" : ""}`}
                  href="#/admin"
                >
                  Админ
                </a>
              ) : null}
              <a className="primary" href="#/create">
                Продать работу
              </a>
              {user ? (
                <div className="nav-user">
                  <span>@{user.login}</span>
                  <button className="secondary" onClick={handleLogout}>
                    Выйти
                  </button>
                </div>
              ) : null}
            </div>
          </nav>
        </header>
      ) : null}
      <main className="main">
      {route === "/" ? (
        <header className="hero">
          <nav className="nav">
            <div className="logo">
              <span className="logo-mark">CL</span>
              <span className="logo-text">CastleLab Market</span>
            </div>
            <div className="nav-actions">
              <a className={`ghost ${route === "/" ? "active" : ""}`} href="#/">
                Главная
              </a>
              <a
                className={`ghost ${route === "/catalog" ? "active" : ""}`}
                href="#/catalog"
              >
                Каталог
              </a>
              <a
                className={`ghost ${route === "/authors" ? "active" : ""}`}
                href="#/authors"
              >
                Авторы
              </a>
              {user ? (
                <a
                  className={`ghost ${
                    route === "/my-listings" ? "active" : ""
                  }`}
                  href="#/my-listings"
                >
                  Мои объявления
                </a>
              ) : (
                <a
                  className={`ghost ${route === "/auth" ? "active" : ""}`}
                  href="#/auth"
                >
                  Войти
                </a>
              )}
              {user ? (
                <a
                  className={`ghost ${route === "/profile" ? "active" : ""}`}
                  href="#/profile"
                >
                  Профиль
                </a>
              ) : null}
              {user ? (
                <a
                  className={`ghost ${route === "/deals" ? "active" : ""}`}
                  href="#/deals"
                >
                  Сделки
                </a>
              ) : null}
              {user && (user.role === "admin" || user.role === "moderator") ? (
                <a
                  className={`ghost ${route === "/admin" ? "active" : ""}`}
                  href="#/admin"
                >
                  Админ
                </a>
              ) : null}
              <a className="primary" href="#/create">
                Продать работу
              </a>
              {user ? (
                <div className="nav-user">
                  <span>@{user.login}</span>
                  <button className="secondary" onClick={handleLogout}>
                    Выйти
                  </button>
                </div>
              ) : null}
            </div>
          </nav>

        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Маркет для студентов</p>
            <h1>Темный рынок знаний для лабораторных и практик</h1>
            <p className="lead">
              Публикуйте работы, проходите модерацию и продавайте безопасно.
              Конспекты, отчеты, проекты и учебные артефакты — в одном месте.
            </p>
            <div className="hero-cta">
              <a className="primary" href="#/catalog">
                Найти работу
              </a>
              <a className="secondary" href="#/create">
                Стать продавцом
              </a>
            </div>
            <div className="hero-stats">
              <div>
                <strong>12k+</strong>
                <span>объявлений в каталоге</span>
              </div>
              <div>
                <strong>4.9</strong>
                <span>средний рейтинг авторов</span>
              </div>
              <div>
                <strong>24/7</strong>
                <span>поддержка сделок</span>
              </div>
            </div>
          </div>

          <div className="hero-art">
            <div className="castle-card">
              <div className="castle-sky" />
              <div className="castle">
                <div className="tower left" />
                <div className="tower right" />
                <div className="keep" />
                <div className="gate" />
              </div>
              <div className="market-orb">
                <span>PRO</span>
                <small>Версия для продавцов</small>
              </div>
              <div className="castle-glow" />
            </div>
            <div className="floating-panel">
              <div>
                <span>Сделка завершена</span>
                <strong>+540 ₽</strong>
              </div>
              <p>Лаба по криптографии</p>
            </div>
          </div>
        </div>
      </header>
      ) : null}

      {route === "/" ? (
      <section className="section" id="catalog">
        <div className="section-head">
          <h2>Категории работ</h2>
          <p>Выбирайте формат, стиль и уровень сложности.</p>
        </div>
        <div className="category-grid">
          {categories.map((item) => (
            <article key={item.title} className="category-card">
              <h3>{item.title}</h3>
              <p>{item.subtitle}</p>
              <a className="text-button" href="#/catalog">
                Открыть
              </a>
            </article>
          ))}
        </div>
      </section>
      ) : null}


      {route === "/catalog" ? (
      <>
      <section className="page-hero">
        <div>
          <p className="eyebrow">Каталог</p>
          <h1>Каталог объявлений</h1>
          <p className="lead">
            Фильтруйте по дисциплинам, цене и формату. Витрины всегда под
            контролем модерации.
          </p>
        </div>
        <div className="page-actions">
          <a className="primary" href="#/create">
            Продать работу
          </a>
          <a className="ghost" href="#/authors">
            Авторы
          </a>
        </div>
      </section>

      <section className="section" id="listings">
        <div className="section-head">
          <h2>Популярные объявления</h2>
          <p>Проверенные работы от лучших студентов.</p>
        </div>
        <div className="listing-filters">
          <label className="filter-field">
            <span>Поиск</span>
            <input
              value={listingQuery}
              onChange={(event) => setListingQuery(event.target.value)}
              placeholder="Введите тему или предмет"
            />
          </label>
          <label className="filter-field">
            <span>Категория</span>
            <select
              value={listingCategory}
              onChange={(event) => setListingCategory(event.target.value)}
            >
              <option value="Все">Все</option>
              {listingCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            <span>Сортировка</span>
            <select
              value={listingSort}
              onChange={(event) => setListingSort(event.target.value)}
            >
              <option value="default">По умолчанию</option>
              <option value="price-asc">Цена по возрастанию</option>
              <option value="price-desc">Цена по убыванию</option>
            </select>
          </label>
          <label className="filter-field">
            <span>Избранное</span>
            <button
              className={`ghost ${showFavoritesOnly ? "active" : ""}`}
              type="button"
              onClick={() => setShowFavoritesOnly((prev) => !prev)}
            >
              {showFavoritesOnly
                ? "Показать все"
                : `Только избранное (${favorites.length})`}
            </button>
          </label>
        </div>
        {showDemoListings ? (
          <p className="form-hint">
            Пока нет опубликованных объявлений — показываем демо.
          </p>
        ) : null}
        {listingsError ? (
          <p className="form-error">{listingsError}</p>
        ) : null}
        <div className="listing-grid">
          {filteredListings.map((item) => {
            const listingKey = getListingKey(item);
            const isFavorite = favorites.includes(listingKey);
            return (
              <article key={item.id || item.title} className="listing-card">
                <div className="listing-top">
                  <div>
                    <p className="listing-title">{item.title}</p>
                    {item.author ? (
                      <button
                        className="listing-author link-button"
                        type="button"
                        onClick={() => handleProfileQuickView(item.author)}
                      >
                        @{item.author}
                      </button>
                    ) : (
                      <span className="listing-author">Аноним</span>
                    )}
                  </div>
                  <span className="listing-price">{formatPrice(item.price)}</span>
                </div>
                {item.description ? (
                  <p className="listing-description">{item.description}</p>
                ) : null}
                <div className="listing-tags">
                  {(item.tags || [item.category]).map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <div className="listing-bottom">
                  <span className="rating">
                    {item.rating ? `Рейтинг ${item.rating}` : "Проверено"}
                  </span>
                  <div className="listing-actions">
                    <button
                      className={`ghost ${isFavorite ? "active" : ""}`}
                      type="button"
                      onClick={() => toggleFavorite(listingKey)}
                    >
                      {isFavorite ? "В избранном" : "В избранное"}
                    </button>
                    <button
                      className="secondary"
                      type="button"
                      onClick={() => openListing(item)}
                    >
                      Подробнее
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
          {!filteredListings.length ? (
            <p className="form-hint">Ничего не найдено.</p>
          ) : null}
        </div>
      </section>
      </>
      ) : null}

      {route === "/" ? (
      <section className="section split">
        <div className="split-copy">
          <h2>Защита сделок и атмосфера замка</h2>
          <p>
            Каждая сделка проходит через эскроу. Рейтинги, гарант и защита
            контента позволяют чувствовать себя как в крепости.
          </p>
          <ul className="feature-list">
            <li>Эскроу до подтверждения качества</li>
            <li>Защита контента и водяные знаки</li>
            <li>Личный кабинет продавца</li>
            <li>Гибкие скидки и промо</li>
          </ul>
          <a className="primary" href="#/create">
            Создать витрину
          </a>
        </div>
        <div className="split-panel">
          <div className="panel-card">
            <h3>Castle Shield</h3>
            <p>Проверка файлов и контроль качества.</p>
            <div className="panel-meter">
              <span>Безопасность</span>
              <strong>98%</strong>
            </div>
            <div className="panel-bar" />
          </div>
          <div className="panel-card alt">
            <h3>Arcane Insights</h3>
            <p>Аналитика продаж по дисциплинам.</p>
            <div className="panel-meter">
              <span>Спрос</span>
              <strong>+32%</strong>
            </div>
            <div className="panel-bar warm" />
          </div>
        </div>
      </section>
      ) : null}

      {route === "/" ? (
      <section className="section steps">
        <div className="section-head">
          <h2>Как начать продавать</h2>
          <p>Три шага до первых монет.</p>
        </div>
        <div className="steps-grid">
          {steps.map((step, index) => (
            <article key={step.title} className="step-card">
              <span className="step-index">0{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>
      ) : null}

      {route === "/authors" ? (
      <>
      <section className="page-hero">
        <div>
          <p className="eyebrow">Авторы</p>
          <h1>Витрины студентов</h1>
          <p className="lead">
            Найдите автора по никнейму и посмотрите все одобренные работы.
          </p>
        </div>
        <div className="page-actions">
          <a className="primary" href="#/catalog">
            Перейти в каталог
          </a>
        </div>
      </section>

      <section className="section profiles" id="profiles">
        <div className="section-head">
          <h2>Профили авторов</h2>
          <p>Найдите автора по никнейму и изучите его витрину.</p>
        </div>
        <div className="profile-lookup">
          <form className="form-card profile-search" onSubmit={handleProfileLookup}>
            <label className="field">
              <span>Никнейм автора</span>
              <input
                value={profileLookup}
                onChange={(event) => {
                  setProfileLookup(event.target.value);
                  if (profileLookupError) setProfileLookupError("");
                }}
                placeholder="например, lab_master"
              />
            </label>
            <button className="primary" type="submit" disabled={profileLookupLoading}>
              {profileLookupLoading ? "Поиск..." : "Найти автора"}
            </button>
          </form>
          {profileLookupError ? <p className="form-error">{profileLookupError}</p> : null}
          {profileLookupInfo ? <p className="form-hint">{profileLookupInfo}</p> : null}
        </div>
        {publicProfile ? (
          <div className="profile-spotlight">
            <div className="profile-card">
              <div className="avatar">
                {publicProfile.avatarUrl ? (
                  <img src={publicProfile.avatarUrl} alt="Avatar" />
                ) : (
                  <span>{publicProfileInitials}</span>
                )}
              </div>
              <div className="profile-meta">
                <strong>{publicProfileLabel || `@${publicProfile.login}`}</strong>
                <span>@{publicProfile.login}</span>
                {publicProfile.university ? <span>{publicProfile.university}</span> : null}
                {publicProfile.faculty ? <span>{publicProfile.faculty}</span> : null}
                {publicProfile.city ? <span>{publicProfile.city}</span> : null}
              </div>
              {publicProfile.bio ? (
                <p className="profile-bio">{publicProfile.bio}</p>
              ) : null}
              <div className="profile-stats">
                <div>
                  <strong>{publicProfile.approvedListings || 0}</strong>
                  <span>одобрено</span>
                </div>
                <div>
                  <strong>{publicProfile.university || "—"}</strong>
                  <span>университет</span>
                </div>
                <div>
                  <strong>{publicProfile.city || "—"}</strong>
                  <span>город</span>
                </div>
              </div>
            </div>
            <div className="profile-listings">
              <div className="profile-listings-head">
                <h3>Работы автора</h3>
                <span>{publicProfileListings.length} работ</span>
              </div>
              {publicProfileListings.length ? (
                <div className="listing-grid">
                  {publicProfileListings.map((item) => {
                    const listingKey = getListingKey(item);
                    const isFavorite = favorites.includes(listingKey);
                    return (
                      <article key={item.id} className="listing-card">
                        <div className="listing-top">
                          <div>
                            <p className="listing-title">{item.title}</p>
                            <span className="listing-author">
                              @{publicProfile.login}
                            </span>
                          </div>
                          <span className="listing-price">
                            {formatPrice(item.price)}
                          </span>
                        </div>
                        {item.description ? (
                          <p className="listing-description">{item.description}</p>
                        ) : null}
                        <div className="listing-tags">
                          <span>{item.category}</span>
                          <span className="status-chip approved">Одобрено</span>
                        </div>
                        <div className="listing-bottom">
                          <span className="rating">Проверено</span>
                          <div className="listing-actions">
                            <button
                              className={`ghost ${isFavorite ? "active" : ""}`}
                              type="button"
                              onClick={() => toggleFavorite(listingKey)}
                            >
                              {isFavorite ? "В избранном" : "В избранное"}
                            </button>
                            <button
                              className="secondary"
                              type="button"
                              onClick={() => openListing(item)}
                            >
                              Подробнее
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="form-hint">У автора пока нет опубликованных работ.</p>
              )}
            </div>
          </div>
        ) : null}
      </section>
      </>
      ) : null}

      {route === "/auth" ? (
      <>
      <section className="page-hero">
        <div>
          <p className="eyebrow">Доступ</p>
          <h1>Войти или зарегистрироваться</h1>
          <p className="lead">
            Логин будет отображаться как никнейм в каталоге и профиле.
          </p>
        </div>
        <div className="page-actions">
          <a className="primary" href="#/catalog">
            Смотреть каталог
          </a>
        </div>
      </section>

      <section className="section auth" id="auth">
        <div className="section-head">
          <h2>Вход и регистрация</h2>
          <p>Логин отображается как ваш nickname в каталоге.</p>
        </div>
        <div className="auth-grid">
          <form className="form-card" onSubmit={handleRegister}>
            <h3>Регистрация</h3>
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                name="email"
                value={registerForm.email}
                onChange={handleFieldChange(setRegisterForm)}
                placeholder="student@mail.com"
                required
              />
            </label>
            <label className="field">
              <span>Логин</span>
              <input
                name="login"
                value={registerForm.login}
                onChange={handleFieldChange(setRegisterForm)}
                placeholder="nickname"
                required
              />
            </label>
            <label className="field">
              <span>Пароль</span>
              <input
                type="password"
                name="password"
                value={registerForm.password}
                onChange={handleFieldChange(setRegisterForm)}
                placeholder="Минимум 6 символов"
                required
              />
            </label>
            <button className="primary" type="submit">
              Создать аккаунт
            </button>
          </form>
          <form className="form-card" onSubmit={handleLogin}>
            <h3>Войти</h3>
            <label className="field">
              <span>Логин или email</span>
              <input
                name="login"
                value={loginForm.login}
                onChange={handleFieldChange(setLoginForm)}
                placeholder="nickname или почта"
                required
              />
            </label>
            <label className="field">
              <span>Пароль</span>
              <input
                type="password"
                name="password"
                value={loginForm.password}
                onChange={handleFieldChange(setLoginForm)}
                placeholder="Ваш пароль"
                required
              />
            </label>
            <button className="secondary" type="submit">
              Войти
            </button>
          </form>
        </div>
        {authInfo ? <p className="form-success">{authInfo}</p> : null}
        {authError ? <p className="form-error">{authError}</p> : null}
        {user ? (
          <div className="auth-status">
            <div>
              <strong>@{user.login}</strong>
              <span>Роль: {user.role}</span>
            </div>
            <button className="ghost" onClick={handleLogout}>
              Выйти
            </button>
          </div>
        ) : null}
      </section>
      </>
      ) : null}

      {route === "/profile" ? (
      <>
      <section className="page-hero">
        <div>
          <p className="eyebrow">Профиль</p>
          <h1>Настройки и данные автора</h1>
          <p className="lead">
            Обновите публичную информацию, безопасность и витрину.
          </p>
        </div>
        <div className="page-actions">
          <a className="primary" href="#/my-listings">
            Мои объявления
          </a>
        </div>
      </section>

      <section className="section profile" id="profile">
        <div className="section-head">
          <h2>Профиль и настройки</h2>
          <p>Обновите публичную информацию и безопасность.</p>
        </div>
        {user ? (
          <div className="profile-grid">
            <div className="profile-card">
              <div className="avatar">
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="Avatar" />
                ) : (
                  <span>{profileInitials}</span>
                )}
              </div>
              <div className="profile-meta">
                <strong>{profileLabel}</strong>
                <span>@{user.login}</span>
                <span>Роль: {user.role}</span>
              </div>
              <p className="profile-note">
                Публичный профиль: /profile/{user.login}
              </p>
              {profileError ? <p className="form-error">{profileError}</p> : null}
            </div>
            <form className="form-card" onSubmit={handleProfileUpdate}>
              <h3>Редактировать профиль</h3>
              <label className="field">
                <span>Отображаемое имя</span>
                <input
                  name="displayName"
                  value={profileForm.displayName}
                  onChange={handleFieldChange(setProfileForm)}
                  placeholder="Ваше имя"
                />
              </label>
              <label className="field">
                <span>О себе</span>
                <textarea
                  name="bio"
                  value={profileForm.bio}
                  onChange={handleFieldChange(setProfileForm)}
                  placeholder="Коротко о вашем опыте и дисциплинах"
                  rows={3}
                />
              </label>
              <label className="field">
                <span>Университет</span>
                <input
                  name="university"
                  value={profileForm.university}
                  onChange={handleFieldChange(setProfileForm)}
                  placeholder="Ваш вуз"
                />
              </label>
              <label className="field">
                <span>Факультет</span>
                <input
                  name="faculty"
                  value={profileForm.faculty}
                  onChange={handleFieldChange(setProfileForm)}
                  placeholder="Факультет или кафедра"
                />
              </label>
              <label className="field">
                <span>Город</span>
                <input
                  name="city"
                  value={profileForm.city}
                  onChange={handleFieldChange(setProfileForm)}
                  placeholder="Город"
                />
              </label>
              <label className="field">
                <span>Ссылка на аватар</span>
                <input
                  name="avatarUrl"
                  value={profileForm.avatarUrl}
                  onChange={handleFieldChange(setProfileForm)}
                  placeholder="https://..."
                />
              </label>
              <button className="primary" type="submit">
                Сохранить
              </button>
              {profileInfo ? <p className="form-success">{profileInfo}</p> : null}
            </form>
            <form className="form-card" onSubmit={handlePasswordChange}>
              <h3>Сменить пароль</h3>
              <label className="field">
                <span>Текущий пароль</span>
                <input
                  type="password"
                  name="currentPassword"
                  value={passwordForm.currentPassword}
                  onChange={handleFieldChange(setPasswordForm)}
                  placeholder="Текущий пароль"
                  required
                />
              </label>
              <label className="field">
                <span>Новый пароль</span>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordForm.newPassword}
                  onChange={handleFieldChange(setPasswordForm)}
                  placeholder="Новый пароль"
                  required
                />
              </label>
              <label className="field">
                <span>Повторите пароль</span>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordForm.confirmPassword}
                  onChange={handleFieldChange(setPasswordForm)}
                  placeholder="Повторите пароль"
                  required
                />
              </label>
              <button className="secondary" type="submit">
                Обновить пароль
              </button>
              {passwordInfo ? <p className="form-success">{passwordInfo}</p> : null}
              {passwordError ? <p className="form-error">{passwordError}</p> : null}
            </form>
          </div>
        ) : (
          <p className="form-hint">Войдите, чтобы редактировать профиль.</p>
        )}
      </section>
      </>
      ) : null}

      {route === "/deals" ? (
      <>
      <section className="page-hero">
        <div>
          <p className="eyebrow">Сделки</p>
          <h1>Оплаты через СБП с удержанием</h1>
          <p className="lead">
            После оплаты деньги остаются на вашем кошельке и уходят продавцу
            только после подтверждения заказа.
          </p>
        </div>
        <div className="page-actions">
          <a className="ghost" href="#/catalog">
            В каталог
          </a>
        </div>
      </section>

      <section className="section deals" id="deals">
        <div className="section-head">
          <h2>Кошелек и статусы</h2>
          <p>Контролируйте удержание и подтверждайте сделки.</p>
        </div>
        {user ? (
          <div className="deals-grid">
            <div className="wallet-card">
              <h3>Мой кошелек</h3>
              <div className="wallet-balance">
                <div>
                  <span>Доступно</span>
                  <strong>{formatPrice(wallet?.available)}</strong>
                </div>
                <div>
                  <span>На удержании</span>
                  <strong>{formatPrice(wallet?.held)}</strong>
                </div>
              </div>
              <p className="form-hint">
                Средства блокируются на вашем кошельке после оплаты через СБП и
                переводятся продавцу после подтверждения заказа. Доступный
                баланс — это деньги, которые уже можно использовать.
              </p>
              {walletError ? <p className="form-error">{walletError}</p> : null}
            </div>

            <div className="deal-panels">
              {ordersError ? <p className="form-error">{ordersError}</p> : null}
              {ordersInfo ? <p className="form-success">{ordersInfo}</p> : null}

              <div className="deal-panel">
                <div className="deal-panel-head">
                  <h3>Мои покупки</h3>
                  <span>{orders.length} сделок</span>
                </div>
                {orders.length ? (
                  orders.map((order) => (
                    <article key={order.id} className="deal-item">
                      <div className="deal-main">
                        <strong>{order.listing?.title || "Работа"}</strong>
                        <span className="deal-meta">
                          Продавец: @{order.seller?.login || "seller"}
                        </span>
                        <span className="deal-meta">
                          Статус:{" "}
                          <span className={`status-chip ${order.status}`}>
                            {orderStatusMap[order.status] || order.status}
                          </span>
                        </span>
                        {order.payment?.status ? (
                          <span className="deal-meta">
                            Оплата:{" "}
                            <span
                              className={`status-chip ${order.payment.status}`}
                            >
                              {paymentStatusMap[order.payment.status] ||
                                order.payment.status}
                            </span>
                          </span>
                        ) : null}
                        {order.payment?.sbpReference ? (
                          <span className="deal-meta">
                            СБП: {order.payment.sbpReference}
                          </span>
                        ) : null}
                      </div>
                      <div className="deal-actions">
                        <span className="listing-price">
                          {formatPrice(order.amount)}
                        </span>
                        {order.status === "pending_payment" ? (
                          order.payment?.status === "pending" ? (
                            order.payment?.provider === "tbank" ? (
                              <span className="form-hint">
                                Ожидаем подтверждение СБП
                              </span>
                            ) : (
                              <button
                                className="primary"
                                type="button"
                                onClick={() =>
                                  handleConfirmSbpPayment(order.id)
                                }
                                disabled={paymentBusy}
                              >
                                Подтвердить оплату
                              </button>
                            )
                          ) : (
                            <button
                              className="primary"
                              type="button"
                              onClick={() =>
                                handleStartSbpPaymentForOrder(order.id)
                              }
                              disabled={paymentBusy}
                            >
                              Оплатить через СБП
                            </button>
                          )
                        ) : null}
                        {order.status === "pending_payment" ? (
                          <button
                            className="ghost"
                            type="button"
                            onClick={() => handleCancelOrder(order.id)}
                            disabled={paymentBusy}
                          >
                            Отменить
                          </button>
                        ) : null}
                        {order.status === "escrow" ? (
                          <button
                            className="secondary"
                            type="button"
                            onClick={() => handleConfirmOrder(order.id)}
                            disabled={paymentBusy}
                          >
                            Подтвердить получение
                          </button>
                        ) : null}
                      </div>
                      {order.payment?.qrPayload ? (
                        <div className="deal-qr">
                          <PaymentQr payload={order.payment.qrPayload} />
                        </div>
                      ) : null}
                      {order.dispute?.status ? (
                        <div className="deal-dispute-status">
                          <span className={`status-chip ${order.dispute.status}`}>
                            {disputeStatusMap[order.dispute.status] ||
                              order.dispute.status}
                          </span>
                          {order.dispute.resolution ? (
                            <span className="form-hint">
                              {disputeResolutionMap[order.dispute.resolution] ||
                                order.dispute.resolution}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                      {order.refund?.status ? (
                        <span className="deal-meta">
                          Возврат:{" "}
                          <span className={`status-chip ${order.refund.status}`}>
                            {refundStatusMap[order.refund.status] ||
                              order.refund.status}
                          </span>
                        </span>
                      ) : null}
                      {order.status === "escrow" && !order.dispute?.status ? (
                        <div className="deal-dispute">
                          <textarea
                            className="admin-notes"
                            placeholder="Опишите проблему"
                            value={disputeDrafts[order.id] || ""}
                            onChange={(event) =>
                              handleDisputeDraftChange(
                                order.id,
                                event.target.value
                              )
                            }
                            rows={2}
                          />
                          <button
                            className="ghost"
                            type="button"
                            onClick={() => handleOpenDispute(order.id)}
                            disabled={paymentBusy}
                          >
                            Открыть спор
                          </button>
                        </div>
                      ) : order.dispute?.status === "open" ? (
                        <p className="form-hint">Спор открыт, ожидайте решения.</p>
                      ) : null}
                      {renderOrderChat(order)}
                    </article>
                  ))
                ) : (
                  <p className="form-hint">Покупок пока нет.</p>
                )}
              </div>

              <div className="deal-panel">
                <div className="deal-panel-head">
                  <h3>Продажи</h3>
                  <span>{sales.length} сделок</span>
                </div>
                {sales.length ? (
                  sales.map((order) => (
                    <article key={order.id} className="deal-item">
                      <div className="deal-main">
                        <strong>{order.listing?.title || "Работа"}</strong>
                        <span className="deal-meta">
                          Покупатель: @{order.buyer?.login || "buyer"}
                        </span>
                        <span className="deal-meta">
                          Статус:{" "}
                          <span className={`status-chip ${order.status}`}>
                            {orderStatusMap[order.status] || order.status}
                          </span>
                        </span>
                        {order.payment?.status ? (
                          <span className="deal-meta">
                            Оплата:{" "}
                            <span
                              className={`status-chip ${order.payment.status}`}>
                              {paymentStatusMap[order.payment.status] ||
                                order.payment.status}
                            </span>
                          </span>
                        ) : null}
                        {order.dispute?.status ? (
                          <span className="deal-meta">
                            Спор:{" "}
                            <span className={`status-chip ${order.dispute.status}`}>
                              {disputeStatusMap[order.dispute.status] ||
                                order.dispute.status}
                            </span>
                          </span>
                        ) : null}
                        {order.refund?.status ? (
                          <span className="deal-meta">
                            Возврат:{" "}
                            <span className={`status-chip ${order.refund.status}`}>
                              {refundStatusMap[order.refund.status] ||
                                order.refund.status}
                            </span>
                          </span>
                        ) : null}
                      </div>
                      <div className="deal-actions">
                        <span className="listing-price">
                          {formatPrice(order.amount)}
                        </span>
                        <span className="form-hint">
                          {order.status === "escrow"
                            ? "Ожидает подтверждения покупателя."
                            : order.status === "released"
                            ? "Деньги зачислены на баланс."
                            : "Ожидает оплаты."}
                        </span>
                      </div>
                      {order.status === "escrow" && !order.dispute?.status ? (
                        <div className="deal-dispute">
                          <textarea
                            className="admin-notes"
                            placeholder="Опишите проблему"
                            value={disputeDrafts[order.id] || ""}
                            onChange={(event) =>
                              handleDisputeDraftChange(
                                order.id,
                                event.target.value
                              )
                            }
                            rows={2}
                          />
                          <button
                            className="ghost"
                            type="button"
                            onClick={() => handleOpenDispute(order.id)}
                            disabled={paymentBusy}
                          >
                            Открыть спор
                          </button>
                        </div>
                      ) : order.dispute?.status === "open" ? (
                        <p className="form-hint">Спор открыт, ожидайте решения.</p>
                      ) : null}
                      {renderOrderChat(order)}
                    </article>
                  ))
                ) : (
                  <p className="form-hint">Продаж пока нет.</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="form-hint">Войдите, чтобы видеть сделки.</p>
        )}
      </section>
      </>
      ) : null}

      {route === "/admin" ? (
      <>
      <section className="page-hero">
        <div>
          <p className="eyebrow">Админ</p>
          <h1>Модерация и управление</h1>
          <p className="lead">
            Отслеживайте заявки, управляйте пользователями и контентом.
          </p>
        </div>
        <div className="page-actions">
          <a className="ghost" href="#/catalog">
            Каталог
          </a>
        </div>
      </section>

      <section className="section admin" id="admin">
        <div className="section-head">
          <h2>Админ-панель</h2>
          <p>Модерация, утвержденные объявления и пользователи.</p>
        </div>
        {user && (user.role === "admin" || user.role === "moderator") ? (
          <>
            <div className="admin-tabs">
              <button
                className={`ghost ${adminView === "moderation" ? "active" : ""}`}
                onClick={() => setAdminView("moderation")}
                type="button"
              >
                Модерация
              </button>
              <button
                className={`ghost ${adminView === "approved" ? "active" : ""}`}
                onClick={() => setAdminView("approved")}
                type="button"
              >
                Одобренные
              </button>
              <button
                className={`ghost ${adminView === "disputes" ? "active" : ""}`}
                onClick={() => setAdminView("disputes")}
                type="button"
              >
                Споры
              </button>
              {user.role === "admin" ? (
                <button
                  className={`ghost ${adminView === "users" ? "active" : ""}`}
                  onClick={() => setAdminView("users")}
                  type="button"
                >
                  Пользователи
                </button>
              ) : null}
            </div>
            {adminError ? <p className="form-error">{adminError}</p> : null}
            {adminInfo ? <p className="form-success">{adminInfo}</p> : null}

            {adminView === "moderation" ? (
              <div className="admin-grid">
                {pendingListings.length ? (
                  pendingListings.map((item) => (
                    <article key={item.id} className="listing-card admin-card">
                      <div className="listing-top">
                        <div>
                          <p className="listing-title">{item.title}</p>
                          <span className="listing-author">
                            @{item.author || "student"}
                          </span>
                        </div>
                        <span className="listing-price">
                          {formatPrice(item.price)}
                        </span>
                      </div>
                      <p className="admin-description">{item.description}</p>
                      <div className="listing-tags">
                        <span>{item.category}</span>
                        <span className={`status-chip ${item.status}`}>
                          {statusMap[item.status] || item.status}
                        </span>
                      </div>
                      {item.moderation?.notes ? (
                        <p className="admin-note">
                          Последний комментарий: {item.moderation.notes}
                        </p>
                      ) : null}
                      <textarea
                        className="admin-notes"
                        placeholder="Комментарий модератора"
                        value={moderationNotes[item.id] || ""}
                        onChange={(event) =>
                          handleModerationNoteChange(item.id, event.target.value)
                        }
                        rows={2}
                      />
                      <div className="admin-actions">
                        <button
                          className="primary"
                          type="button"
                          onClick={() =>
                            handleModerateListing(item.id, "approved")
                          }
                        >
                          Одобрить
                        </button>
                        <button
                          className="ghost"
                          type="button"
                          onClick={() =>
                            handleModerateListing(item.id, "rejected")
                          }
                        >
                          Отклонить
                        </button>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="form-hint">Нет объявлений на модерации.</p>
                )}
              </div>
            ) : null}

            {adminView === "approved" ? (
              <div className="admin-grid">
                {approvedListings.length ? (
                  approvedListings.map((item) => (
                    <article key={item.id} className="listing-card admin-card">
                      <div className="listing-top">
                        <div>
                          <p className="listing-title">{item.title}</p>
                          <span className="listing-author">
                            @{item.author || "student"}
                          </span>
                        </div>
                        <span className="listing-price">
                          {formatPrice(item.price)}
                        </span>
                      </div>
                      <p className="admin-description">{item.description}</p>
                      <div className="listing-tags">
                        <span>{item.category}</span>
                        <span className={`status-chip ${item.status}`}>
                          {statusMap[item.status] || item.status}
                        </span>
                      </div>
                      {editListingId === item.id ? (
                        <form
                          className="form-card admin-edit"
                          onSubmit={handleEditListingSubmit}
                        >
                          <label className="field">
                            <span>Название</span>
                            <input
                              name="title"
                              value={editListingForm.title}
                              onChange={handleFieldChange(setEditListingForm)}
                              required
                            />
                          </label>
                          <label className="field">
                            <span>Категория</span>
                            <select
                              name="category"
                              value={editListingForm.category}
                              onChange={handleFieldChange(setEditListingForm)}
                            >
                              {listingCategories.map((category) => (
                                <option key={category} value={category}>
                                  {category}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="field">
                            <span>Цена</span>
                            <input
                              name="price"
                              value={editListingForm.price}
                              onChange={handleFieldChange(setEditListingForm)}
                              required
                            />
                          </label>
                          <label className="field">
                            <span>Описание</span>
                            <textarea
                              name="description"
                              value={editListingForm.description}
                              onChange={handleFieldChange(setEditListingForm)}
                              rows={3}
                              required
                            />
                          </label>
                          <div className="form-actions">
                            <button className="primary" type="submit">
                              Сохранить
                            </button>
                            <button
                              className="ghost"
                              type="button"
                              onClick={handleEditListingCancel}
                            >
                              Отмена
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="admin-actions">
                          <button
                            className="secondary"
                            type="button"
                            onClick={() => handleEditListingStart(item)}
                          >
                            Редактировать
                          </button>
                        </div>
                      )}
                    </article>
                  ))
                ) : (
                  <p className="form-hint">Пока нет одобренных объявлений.</p>
                )}
              </div>
            ) : null}

            {adminView === "disputes" ? (
              <div className="admin-grid">
                {adminDisputes.length ? (
                  adminDisputes.map((dispute) => (
                    <article key={dispute.id} className="listing-card admin-card">
                      <div className="listing-top">
                        <div>
                          <p className="listing-title">
                            {dispute.order?.listingTitle || "Спор"}
                          </p>
                          <span className="listing-author">
                            Покупатель: @{dispute.buyer?.login || "buyer"}
                          </span>
                        </div>
                        <span className="listing-price">
                          {formatPrice(dispute.order?.amount)}
                        </span>
                      </div>
                      <p className="admin-description">
                        Продавец: @{dispute.seller?.login || "seller"}
                      </p>
                      {dispute.reason ? (
                        <p className="admin-note">{dispute.reason}</p>
                      ) : (
                        <p className="form-hint">Причина не указана.</p>
                      )}
                      <div className="listing-tags">
                        <span
                          className={`status-chip ${dispute.status || "pending"}`}
                        >
                          {disputeStatusMap[dispute.status] || dispute.status}
                        </span>
                        {dispute.resolution ? (
                          <span>
                            {disputeResolutionMap[dispute.resolution] ||
                              dispute.resolution}
                          </span>
                        ) : null}
                      </div>
                      <textarea
                        className="admin-notes"
                        placeholder="Комментарий по спору"
                        value={adminDisputeNotes[dispute.id] || ""}
                        onChange={(event) =>
                          handleAdminDisputeNoteChange(
                            dispute.id,
                            event.target.value
                          )
                        }
                        rows={2}
                      />
                      <div className="admin-actions">
                        <button
                          className="secondary"
                          type="button"
                          onClick={() => handleResolveDispute(dispute.id, "release")}
                          disabled={paymentBusy}
                        >
                          Отпустить продавцу
                        </button>
                        <button
                          className="ghost"
                          type="button"
                          onClick={() => handleResolveDispute(dispute.id, "refund")}
                          disabled={paymentBusy}
                        >
                          Возврат покупателю
                        </button>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="form-hint">Открытых споров нет.</p>
                )}
              </div>
            ) : null}

            {adminView === "users" && user.role === "admin" ? (
              <div className="admin-users">
                {adminUsers.length ? (
                  adminUsers.map((member) => (
                    <div key={member.id} className="admin-user">
                      <div className="admin-user-info">
                        <strong>@{member.login}</strong>
                        <span>{member.email}</span>
                        <span className="status-chip">
                          {statusMap[member.status] || member.status}
                        </span>
                      </div>
                      <div className="admin-user-actions">
                        <select
                          value={member.role}
                          onChange={(event) =>
                            handleUserRoleChange(member.id, event.target.value)
                          }
                        >
                          <option value="user">user</option>
                          <option value="moderator">moderator</option>
                          <option value="admin">admin</option>
                        </select>
                        <button
                          className="secondary"
                          type="button"
                          onClick={() =>
                            handleUserStatusChange(
                              member.id,
                              member.status === "active" ? "blocked" : "active"
                            )
                          }
                        >
                          {member.status === "active"
                            ? "Заблокировать"
                            : "Разблокировать"}
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="form-hint">Пользователи не найдены.</p>
                )}
              </div>
            ) : null}
          </>
        ) : (
          <p className="form-hint">Доступ только для модераторов.</p>
        )}
      </section>
      </>
      ) : null}

      {route === "/create" ? (
      <>
      <section className="page-hero">
        <div>
          <p className="eyebrow">Продажи</p>
          <h1>Создать объявление</h1>
          <p className="lead">
            Новая работа попадет в модерацию, после чего будет опубликована.
          </p>
        </div>
        <div className="page-actions">
          <a className="ghost" href="#/catalog">
            Смотреть каталог
          </a>
        </div>
      </section>

      <section className="section" id="create">
        <div className="section-head">
          <h2>Создать объявление</h2>
          <p>Новая работа попадет в модерацию и затем будет опубликована.</p>
        </div>
        {user ? (
          <form className="form-card wide" onSubmit={handleCreateListing}>
            <div className="form-grid">
              <label className="field">
                <span>Название</span>
                <input
                  name="title"
                  value={listingForm.title}
                  onChange={handleFieldChange(setListingForm)}
                  placeholder="Например: Базы данных — лаба 4"
                  required
                />
              </label>
              <label className="field">
                <span>Категория</span>
                <select
                  name="category"
                  value={listingForm.category}
                  onChange={handleFieldChange(setListingForm)}
                >
                  {listingCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Цена (₽)</span>
                <input
                  name="price"
                  value={listingForm.price}
                  onChange={handleFieldChange(setListingForm)}
                  placeholder="450"
                  required
                />
              </label>
              <label className="field full">
                <span>Описание</span>
                <textarea
                  name="description"
                  value={listingForm.description}
                  onChange={handleFieldChange(setListingForm)}
                  placeholder="Что внутри, формат, объем, дополнительные материалы."
                  rows={4}
                  required
                />
              </label>
            </div>
            <div className="form-actions">
              <button className="primary" type="submit">
                Отправить на модерацию
              </button>
              {createInfo ? <span className="form-success">{createInfo}</span> : null}
              {createError ? <span className="form-error">{createError}</span> : null}
            </div>
          </form>
        ) : (
          <p className="form-hint">Нужно войти, чтобы создавать объявления.</p>
        )}
      </section>
      </>
      ) : null}

      {route === "/my-listings" ? (
      <>
      <section className="page-hero">
        <div>
          <p className="eyebrow">Кабинет</p>
          <h1>Мои объявления</h1>
          <p className="lead">
            Контроль статуса модерации, редактирование и история правок.
          </p>
        </div>
        <div className="page-actions">
          <a className="primary" href="#/create">
            Добавить объявление
          </a>
        </div>
      </section>

      <section className="section" id="my-listings">
        <div className="section-head">
          <h2>Мои объявления</h2>
          <p>Контроль статуса модерации и обновлений.</p>
        </div>
        {user ? (
          <div className="listing-grid">
            {(isLoading ? [] : myListings).map((item) => (
              <article key={item.id} className="listing-card">
                <div className="listing-top">
                  <div>
                    <p className="listing-title">{item.title}</p>
                    <span className="listing-author">Вы</span>
                  </div>
                  <span className="listing-price">{formatPrice(item.price)}</span>
                </div>
                <div className="listing-tags">
                  <span>{item.category}</span>
                  <span className={`status-chip ${item.status}`}>
                    {statusMap[item.status] || item.status}
                  </span>
                </div>
                {item.moderation?.notes ? (
                  <p className="listing-note">
                    Комментарий модератора
                    {item.moderation.at ? ` (${formatDate(item.moderation.at)})` : ""}:
                    {` ${item.moderation.notes}`}
                  </p>
                ) : null}
                {editListingId === item.id ? (
                  <form
                    className="form-card admin-edit"
                    onSubmit={handleEditListingSubmit}
                  >
                    <label className="field">
                      <span>Название</span>
                      <input
                        name="title"
                        value={editListingForm.title}
                        onChange={handleFieldChange(setEditListingForm)}
                        required
                      />
                    </label>
                    <label className="field">
                      <span>Категория</span>
                      <select
                        name="category"
                        value={editListingForm.category}
                        onChange={handleFieldChange(setEditListingForm)}
                      >
                        {listingCategories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Цена</span>
                      <input
                        name="price"
                        value={editListingForm.price}
                        onChange={handleFieldChange(setEditListingForm)}
                        required
                      />
                    </label>
                    <label className="field">
                      <span>Описание</span>
                      <textarea
                        name="description"
                        value={editListingForm.description}
                        onChange={handleFieldChange(setEditListingForm)}
                        rows={3}
                        required
                      />
                    </label>
                    <div className="form-actions">
                      <button className="primary" type="submit">
                        Сохранить
                      </button>
                      <button
                        className="ghost"
                        type="button"
                        onClick={handleEditListingCancel}
                      >
                        Отмена
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="listing-bottom">
                    <span className="rating">Статус</span>
                    <button
                      className="secondary"
                      type="button"
                      onClick={() => handleEditListingStart(item)}
                    >
                      Редактировать
                    </button>
                  </div>
                )}
              </article>
            ))}
            {!isLoading && !myListings.length ? (
              <p className="form-hint">Пока нет объявлений.</p>
            ) : null}
          </div>
        ) : (
          <p className="form-hint">Войдите, чтобы видеть свои объявления.</p>
        )}
      </section>
      </>
      ) : null}

      {route === "/" ? (
      <section className="cta">
        <div>
          <h2>Открой витрину знаний</h2>
          <p>
            Создайте витрину, собирайте репутацию и продавайте быстрее. Ваша
            работа - это артефакт, а мы бережем сделки.
          </p>
        </div>
        <div className="cta-actions">
          <a className="primary" href="#/auth">
            Создать аккаунт
          </a>
          <a className="ghost" href="#/catalog">
            Смотреть каталог
          </a>
        </div>
      </section>
      ) : null}

      {![
        "/",
        "/catalog",
        "/authors",
        "/auth",
        "/profile",
        "/deals",
        "/create",
        "/my-listings",
        "/admin",
      ].includes(route) ? (
        <section className="section not-found">
          <div className="section-head">
            <h2>Страница не найдена</h2>
            <p>Похоже, вы попали в неизвестный зал замка.</p>
          </div>
          <a className="primary" href="#/">
            На главную
          </a>
        </section>
      ) : null}
      </main>

      {selectedListing ? (
        <div className="modal-backdrop" onClick={closeListing} role="presentation">
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <p className="modal-title">{selectedListing.title}</p>
                <span className="modal-author">
                  {selectedListing.author
                    ? `@${selectedListing.author}`
                    : "Аноним"}
                </span>
              </div>
              <button className="ghost" type="button" onClick={closeListing}>
                Закрыть
              </button>
            </div>
            <div className="modal-body">
              <p>
                {selectedListing.description ||
                  "Описание появится после публикации."}
              </p>
              <div className="modal-tags">
                <span>{selectedListing.category || "Категория"}</span>
                {selectedListing.rating ? (
                  <span>Рейтинг {selectedListing.rating}</span>
                ) : null}
              </div>
            </div>
            <div className="modal-actions">
              <span className="listing-price">
                {formatPrice(selectedListing.price)}
              </span>
              <button
                className={`ghost ${selectedListingFavorite ? "active" : ""}`}
                type="button"
                onClick={() => toggleFavorite(selectedListingKey)}
              >
                {selectedListingFavorite ? "В избранном" : "В избранное"}
              </button>
              {!user ? (
                <a className="primary" href="#/auth">
                  Войти для покупки
                </a>
              ) : isSelectedListingOwner ? (
                <span className="form-hint">Вы автор этой работы</span>
              ) : !selectedListing?.id ? (
                <span className="form-hint">
                  Оплата доступна после запуска API.
                </span>
              ) : selectedListingOrder ? (
                selectedListingOrder.status === "pending_payment" ? (
                  selectedListingOrder.payment?.status === "pending" ? (
                    selectedListingOrder.payment?.provider === "tbank" ? (
                      <span className="form-hint">
                        Ожидаем подтверждение СБП
                      </span>
                    ) : (
                      <button
                        className="primary"
                        type="button"
                        onClick={() =>
                          handleConfirmSbpPayment(selectedListingOrder.id)
                        }
                        disabled={paymentBusy}
                      >
                        Подтвердить оплату
                      </button>
                    )
                  ) : (
                    <button
                      className="primary"
                      type="button"
                      onClick={() =>
                        handleStartSbpPaymentForOrder(selectedListingOrder.id)
                      }
                      disabled={paymentBusy}
                    >
                      Оплатить через СБП
                    </button>
                  )
                ) : selectedListingOrder.status === "escrow" ? (
                  <button
                    className="secondary"
                    type="button"
                    onClick={() => handleConfirmOrder(selectedListingOrder.id)}
                    disabled={paymentBusy}
                  >
                    Подтвердить получение
                  </button>
                ) : (
                  <span className="form-hint">Сделка завершена</span>
                )
              ) : (
                <button
                  className="primary"
                  type="button"
                  onClick={() => handleStartSbpPaymentForListing(selectedListing.id)}
                  disabled={paymentBusy}
                >
                  Оплатить через СБП
                </button>
              )}
            </div>
            {selectedListingOrder ? (
              <div className="payment-card">
                <div className="payment-row">
                  <span>Статус заказа</span>
                  <span className={`status-chip ${selectedListingOrder.status}`}>
                    {orderStatusMap[selectedListingOrder.status] ||
                      selectedListingOrder.status}
                  </span>
                </div>
                {selectedListingOrder.payment?.status ? (
                  <div className="payment-row">
                    <span>Оплата</span>
                    <span
                      className={`status-chip ${selectedListingOrder.payment.status}`}
                    >
                      {paymentStatusMap[selectedListingOrder.payment.status] ||
                        selectedListingOrder.payment.status}
                    </span>
                  </div>
                ) : null}
                {selectedListingOrder.payment?.sbpReference ? (
                  <p className="form-hint">
                    СБП: {selectedListingOrder.payment.sbpReference}
                  </p>
                ) : null}
                {selectedListingOrder.payment?.qrPayload ? (
                  <div className="deal-qr">
                    <PaymentQr payload={selectedListingOrder.payment.qrPayload} />
                  </div>
                ) : null}
                {selectedListingOrder.dispute?.status ? (
                  <p className="form-hint">
                    Спор:{" "}
                    {disputeStatusMap[selectedListingOrder.dispute.status] ||
                      selectedListingOrder.dispute.status}
                  </p>
                ) : null}
                {selectedListingOrder.refund?.status ? (
                  <p className="form-hint">
                    Возврат:{" "}
                    {refundStatusMap[selectedListingOrder.refund.status] ||
                      selectedListingOrder.refund.status}
                  </p>
                ) : null}
                {ordersError ? <p className="form-error">{ordersError}</p> : null}
                {ordersInfo ? <p className="form-success">{ordersInfo}</p> : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <footer className="footer">
        <div>
          <span>CastleLab Market</span>
          <p>Территория знаний для студентов и выпускников.</p>
        </div>
        <div className="footer-links">
          <a href="#">О платформе</a>
          <a href="#">Поддержка</a>
          <a href="#">Правила</a>
          <a href="#">Контакты</a>
        </div>
      </footer>
    </div>
  );
}
