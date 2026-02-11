import axios from 'axios';
import { ScheduledMessage, CreateMessageRequest, UpdateMessageRequest, MessageTemplate, CreateTemplateRequest, UpdateTemplateRequest, User, LineGroup, LoginResponse } from '../types';

const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

export const messageApi = {
    // Get all messages
    getAll: async (): Promise<ScheduledMessage[]> => {
        const response = await api.get<ScheduledMessage[]>('/messages');
        return response.data;
    },

    // Get single message
    getById: async (id: string): Promise<ScheduledMessage> => {
        const response = await api.get<ScheduledMessage>(`/messages/${id}`);
        return response.data;
    },

    // Create new message
    create: async (data: CreateMessageRequest): Promise<ScheduledMessage> => {
        const response = await api.post<ScheduledMessage>('/messages', data);
        return response.data;
    },

    // Update message
    update: async (id: string, data: UpdateMessageRequest): Promise<ScheduledMessage> => {
        const response = await api.put<ScheduledMessage>(`/messages/${id}`, data);
        return response.data;
    },

    // Cancel message
    cancel: async (id: string): Promise<ScheduledMessage> => {
        const response = await api.delete<ScheduledMessage>(`/messages/${id}`);
        return response.data;
    },

    // Upload image
    uploadImage: async (file: File): Promise<{ url: string; filename: string }> => {
        const formData = new FormData();
        formData.append('image', file);

        const response = await api.post<{ url: string; filename: string }>(
            '/messages/upload',
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );
        return response.data;
    },
};

export const templateApi = {
    // Get all templates
    getAll: async (): Promise<MessageTemplate[]> => {
        const response = await api.get<MessageTemplate[]>('/templates');
        return response.data;
    },

    // Create template
    create: async (data: CreateTemplateRequest): Promise<MessageTemplate> => {
        const response = await api.post<MessageTemplate>('/templates', data);
        return response.data;
    },

    // Update template
    update: async (id: string, data: UpdateTemplateRequest): Promise<MessageTemplate> => {
        const response = await api.put<MessageTemplate>(`/templates/${id}`, data);
        return response.data;
    },

    // Delete template
    delete: async (id: string): Promise<void> => {
        await api.delete(`/templates/${id}`);
    }
};

export const authApi = {
    // Login with LINE
    login: async (idToken: string): Promise<LoginResponse> => {
        const response = await api.post<LoginResponse>('/auth/login', { idToken });
        return response.data;
    },

    // Get current user info
    getMe: async (lineUserId: string): Promise<{ user: User }> => {
        const response = await api.get<{ user: User }>('/auth/me', {
            params: { lineUserId }
        });
        return response.data;
    }
};

export const adminApi = {
    // Get all users
    getUsers: async (): Promise<User[]> => {
        const response = await api.get<User[]>('/admin/users');
        return response.data;
    },

    // Get all groups
    getGroups: async (): Promise<LineGroup[]> => {
        const response = await api.get<LineGroup[]>('/admin/groups');
        return response.data;
    },

    // Assign groups to user
    assignGroups: async (userId: string, groupIds: string[]): Promise<{ success: boolean; user: User }> => {
        const response = await api.post<{ success: boolean; user: User }>('/admin/assign', {
            userId,
            groupIds
        });
        return response.data;
    }
};

export default api;
