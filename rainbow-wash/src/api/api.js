const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://rainbow-wash-backend-production.up.railway.app';

// Helper function to get authorization headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token') || localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

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
  return data;
};

export const fetchBookings = async () => {
  const response = await fetch(`${API_BASE_URL}/bookings`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch bookings');
  return await response.json();
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


// --- ORDERS ---
export const createOrder = async (orderData) => {
  const response = await fetch(`${API_BASE_URL}/orders`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(orderData),
  });
  if (!response.ok) throw new Error('Failed to create order');
  return await response.json();
};

export const fetchOrders = async () => {
  const response = await fetch(`${API_BASE_URL}/orders`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch orders');
  return await response.json();
};

export const updateOrderStatus = async (id, status) => {
  const response = await fetch(`${API_BASE_URL}/orders/${id}/status?status=${status}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to update order status');
  return await response.json();
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