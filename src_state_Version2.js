export const state = {
  providers: [],
  groups: []
};

export function resetState(next) {
  state.providers = next.providers || [];
  state.groups = next.groups || [];
}