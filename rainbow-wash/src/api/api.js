const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://rainbow-wash-backend-production.up.railway.app/api';

// Helper function to get authorization headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token') || localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

// The backend returns entities with a numeric `id` (the real DB primary key)
// plus a separate human-readable `referenceId` (e.g. "LND-A1B2C3"). Every part
// of this app displays and searches by that human reference as `.id` — so we
// remap here, once, in one place: `.id` becomes the display reference, and the
// real numeric key is kept under `.dbId` for any follow-up PATCH/update calls.
const mapRef = (obj) => (obj && obj.referenceId ? { ...obj, id: obj.referenceId, dbId: obj.id } : obj);
const mapRefList = (arr) => (Array.isArray(arr) ? arr.map(mapRef) : arr);

// --- AUTH ---
export const loginAdmin = async ({ email, password }) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to login');
  }

  localStorage.setItem('token', data.token);
  localStorage.setItem('authToken', data.token);
  localStorage.setItem('userRole', data.role);
  localStorage.setItem('userName', data.name);

  return data; // { token, role, name, message }
};

export const logoutUser = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('authToken');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userName');
};
export const changePassword = async ({ currentPassword, newPassword }) => {
  const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to change password');
  return data; // { message }
};

export const updateProduct = async (id, productData) => {
  const response = await fetch(`${API_BASE_URL}/products/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(productData),
  });
  if (!response.ok) throw new Error('Failed to update product');
  return await response.json();
};

export const deleteProduct = async (id) => {
  const response = await fetch(`${API_BASE_URL}/products/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to delete product');
  return true;
};
// --- CLEANING BOOKINGS ---
export const createBooking = async (bookingData) => {
  const response = await fetch(`${API_BASE_URL}/bookings`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(bookingData),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to create booking');
  return mapRef(data);
};

export const fetchBookings = async () => {
  const response = await fetch(`${API_BASE_URL}/bookings`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch bookings');
  return mapRefList(await response.json());
};

// Partial update — status, confirmed price (payable), payment status, archived, printed.
export const updateBooking = async (dbId, patch) => {
  const response = await fetch(`${API_BASE_URL}/bookings/${dbId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(patch),
  });
  if (!response.ok) throw new Error('Failed to update booking');
  return mapRef(await response.json());
};

// Admin only — permanent removal, used from the History tab's delete action.
export const deleteBooking = async (dbId) => {
  const response = await fetch(`${API_BASE_URL}/bookings/${dbId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to delete booking');
  return true;
};

// --- PRODUCTS ---
export const fetchProducts = async () => {
  const response = await fetch(`${API_BASE_URL}/products`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch products');
  return await response.json();
};

export const createProduct = async (productData) => {
  const response = await fetch(`${API_BASE_URL}/products`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(productData),
  });
  if (!response.ok) throw new Error('Failed to create product');
  return await response.json();
};

// --- LAUNDRY SERVICES ---
export const fetchCleaningServices = async () => {
  const response = await fetch(`${API_BASE_URL}/services`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch cleaning services');
  return await response.json();
};

export const createLaundryService = async (serviceData) => {
  const response = await fetch(`${API_BASE_URL}/services`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(serviceData),
  });
  if (!response.ok) throw new Error('Failed to create service');
  return await response.json();
};

export const updateLaundryService = async (id, serviceData) => {
  const response = await fetch(`${API_BASE_URL}/services/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(serviceData),
  });
  if (!response.ok) throw new Error('Failed to update service');
  return await response.json();
};

export const deleteLaundryService = async (id) => {
  const response = await fetch(`${API_BASE_URL}/services/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to delete service');
  return true;
};


// --- LAUNDRY ORDERS ---
export const createOrder = async (orderData) => {
  const response = await fetch(`${API_BASE_URL}/orders`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(orderData),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to create order');
  return mapRef(data);
};

export const fetchOrders = async () => {
  const response = await fetch(`${API_BASE_URL}/orders`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch orders');
  return mapRefList(await response.json());
};

// Public — used by the Track Order page, no login required. Returns null if
// nothing matches that reference (rather than throwing), since "not found" is
// an expected result here, not an error.
export const trackOrder = async (referenceId) => {
  const response = await fetch(`${API_BASE_URL}/orders/track/${encodeURIComponent(referenceId)}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Failed to look up order');
  return mapRef(await response.json());
};

// Partial update — status, total, payment status, archived, printed.
export const updateOrder = async (dbId, patch) => {
  const response = await fetch(`${API_BASE_URL}/orders/${dbId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(patch),
  });
  if (!response.ok) throw new Error('Failed to update order');
  return mapRef(await response.json());
};

// Admin only — permanent removal, used from the History tab's delete action.
export const deleteOrder = async (dbId) => {
  const response = await fetch(`${API_BASE_URL}/orders/${dbId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to delete order');
  return true;
};

// --- SHOP ORDERS ---
export const createShopOrder = async (orderData) => {
  const response = await fetch(`${API_BASE_URL}/shop-orders`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(orderData),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to create shop order');
  return mapRef(data);
};

export const fetchShopOrders = async () => {
  const response = await fetch(`${API_BASE_URL}/shop-orders`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch shop orders');
  return mapRefList(await response.json());
};

// Partial update — status, payment status, archived, printed.
export const updateShopOrder = async (dbId, patch) => {
  const response = await fetch(`${API_BASE_URL}/shop-orders/${dbId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(patch),
  });
  if (!response.ok) throw new Error('Failed to update shop order');
  return mapRef(await response.json());
};

// Admin only — permanent removal, used from the History tab's delete action.
export const deleteShopOrder = async (dbId) => {
  const response = await fetch(`${API_BASE_URL}/shop-orders/${dbId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to delete shop order');
  return true;
};

// --- ADMIN / EMPLOYEES ---
export const createEmployee = async (employeeData) => {
  const response = await fetch(`${API_BASE_URL}/admin/create-employee`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(employeeData),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to create employee');
  }
  return data; // { message, email, tempPassword }
};
export const fetchEmployees = async () => {
  const response = await fetch(`${API_BASE_URL}/admin/employees`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch employees');
  return await response.json();
};

export const resetEmployeePassword = async (id) => {
  const response = await fetch(`${API_BASE_URL}/admin/reset-password/${id}`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to reset password');
  return data; // { message, tempPassword }
};

export const deleteEmployee = async (id) => {
  const response = await fetch(`${API_BASE_URL}/admin/employees/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to delete account');
  }
  return true;
};