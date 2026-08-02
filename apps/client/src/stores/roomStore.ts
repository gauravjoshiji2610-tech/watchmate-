import { useState } from 'react';
import type { Room, Role, ChatMessage } from '@antigravity/shared-types';

export interface RoomStoreState {
  room: Room | null;
  role: Role | null;
  messages: ChatMessage[];
  isMicMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
}

export function useRoomStore() {
  const [state, setState] = useState<RoomStoreState>({
    room: null,
    role: null,
    messages: [],
    isMicMuted: false,
    isCameraOff: true,
    isScreenSharing: false,
  });

  const setRoom = (room: Room | null, role: Role | null) => {
    setState((prev) => ({ ...prev, room, role }));
  };

  const addMessage = (message: ChatMessage) => {
    setState((prev) => ({ ...prev, messages: [...prev.messages, message] }));
  };

  const setMessages = (messages: ChatMessage[]) => {
    setState((prev) => ({ ...prev, messages }));
  };

  const toggleMic = () => {
    setState((prev) => ({ ...prev, isMicMuted: !prev.isMicMuted }));
  };

  const toggleCamera = () => {
    setState((prev) => ({ ...prev, isCameraOff: !prev.isCameraOff }));
  };

  return {
    ...state,
    setRoom,
    addMessage,
    setMessages,
    toggleMic,
    toggleCamera,
  };
}
