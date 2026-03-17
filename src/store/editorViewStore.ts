import { create } from 'zustand';

export type EditorViewMode = 'split' | 'editor' | 'preview';

interface EditorViewStore {
  viewMode: EditorViewMode;
  isEditRoute: boolean;
  setViewMode: (mode: EditorViewMode) => void;
  setIsEditRoute: (isEdit: boolean) => void;
}

export const useEditorViewStore = create<EditorViewStore>((set) => ({
  viewMode: 'preview',
  isEditRoute: false,
  setViewMode: (viewMode) => set({ viewMode }),
  setIsEditRoute: (isEditRoute) => set({ isEditRoute }),
}));
