export interface ScheduledMessage {
    id: string;
    content: string;
    imageUrl: string | null;
    imageUrls?: string[];
    scheduledTime: string;
    status: 'pending' | 'sent' | 'failed' | 'cancelled';
    targetType: 'user' | 'group' | 'room';
    targetIds: string[];
    createdAt: string;
    updatedAt: string;
    logs?: MessageLog[];
}

export interface MessageLog {
    id: string;
    messageId: string;
    sentAt: string;
    status: 'success' | 'failed';
    error: string | null;
}

export interface CreateMessageRequest {
    content: string;
    imageUrl?: string;
    imageUrls?: string[];
    scheduledTime: Date;
    targetType: 'user' | 'group' | 'room';
    targetIds: string[];
    channelAccessToken?: string;
}

export interface UpdateMessageRequest {
    content?: string;
    imageUrl?: string;
    imageUrls?: string[];
    scheduledTime?: Date;
    targetType?: 'user' | 'group' | 'room';
    targetIds?: string[];
}
// Template Types
export interface MessageTemplate {
    id: string;
    name: string;
    targetType: 'user' | 'group' | 'room';
    targetIds: string[];
    channelAccessToken?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateTemplateRequest {
    name: string;
    targetType: 'user' | 'group' | 'room';
    targetIds: string[];
    channelAccessToken?: string;
}

export interface UpdateTemplateRequest extends CreateTemplateRequest { }

// User & Group Types
export interface User {
    id: string;
    lineUserId: string;
    displayName: string;
    pictureUrl?: string;
    role: 'admin' | 'user';
    status: 'active' | 'inactive';
    createdAt: string;
    updatedAt: string;
    assignedGroups?: LineGroup[];
}

export interface LineGroup {
    id: string;
    groupId: string;
    groupName?: string;
    pictureUrl?: string;
    createdAt: string;
    updatedAt: string;
}

export interface LoginRequest {
    idToken: string;
}

export interface LoginResponse {
    success: boolean;
    user: User;
}

export interface AssignGroupsRequest {
    userId: string;
    groupIds: string[];
}

