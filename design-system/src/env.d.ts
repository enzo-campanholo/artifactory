interface ImportMetaEnv {
  // Only the deploy build sets it to `http`, so every other build keeps throwaway state.
  readonly PUBLIC_STATE_TRANSPORT?: string;
}
