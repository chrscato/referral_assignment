import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export const fetchOrders = async () => {
  try {
    const response = await axios.get(`${API_URL}/orders`);
    return response.data;
  } catch (error) {
    console.error('Error fetching orders:', error);
    throw error;
  }
};

export const fetchOrderDetails = async (orderId) => {
  try {
    const response = await axios.get(`${API_URL}/orders/${orderId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching order ${orderId}:`, error);
    throw error;
  }
};

export const processOrder = async (orderId) => {
  try {
    const response = await axios.post(`${API_URL}/orders/${orderId}/process`);
    return response.data;
  } catch (error) {
    console.error(`Error processing order ${orderId}:`, error);
    throw error;
  }
};

export const updateOrder = async (orderId, data) => {
  try {
    const response = await axios.post(`${API_URL}/orders/${orderId}/update`, data);
    return response.data;
  } catch (error) {
    console.error(`Error updating order ${orderId}:`, error);
    throw error;
  }
};

export const approveOrder = async (orderId) => {
  try {
    const response = await axios.post(`${API_URL}/orders/${orderId}/approve`);
    return response.data;
  } catch (error) {
    console.error(`Error approving order ${orderId}:`, error);
    throw error;
  }
};

export const fetchOrderDocuments = async (orderId) => {
  try {
    const response = await axios.get(`${API_URL}/orders/${orderId}/documents`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching documents for order ${orderId}:`, error);
    throw error;
  }
};

export const getDocumentPreviewUrl = (orderId, filename) => {
  return `${API_URL}/orders/${orderId}/documents/${filename}`;
};