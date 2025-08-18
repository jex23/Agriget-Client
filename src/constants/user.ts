// User-related API endpoints
import { API_BASE_URL } from "../constants/api";

export const USER_EDIT_URL = `${API_BASE_URL}/user`;
export const USER_DELETE_URL = `${API_BASE_URL}/user`;
export const USERS_LIST_URL = `${API_BASE_URL}/users`;
export const USER_DELETE_BY_ID_URL = (userId: number | string) => `${API_BASE_URL}/user/${userId}`;
export const USER_CHANGE_PASSWORD_URL = `${API_BASE_URL}/change-password`;
