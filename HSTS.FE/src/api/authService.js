import api from './api';

export const login = async (email, password) => {
  try {
    const response = await api.post('/api/auth/login', {
      email,
      password,
    });

    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      const serverMessage =
        error.response.data.message ||
        error.response.data.title;

      throw new Error(
        serverMessage || 'Đăng nhập thất bại. Vui lòng thử lại.'
      );
    }

    throw new Error('Không thể kết nối đến máy chủ.');
  }
};

export const logout = async () => {
  try {
    await api.post('/api/auth/logout');
  } catch (error) {
    console.error('Lỗi khi đăng xuất:', error);
    throw error;
  }
};

export const refresh = async () => {
  const response = await api.post('/api/auth/refresh');
  return response.data;
};