export class WorldState {
  constructor(flagsSet) {
    // Uses the same Set instance GameState already saves/loads
    this.flags = flagsSet;

    // Optional registry for debugging/inspection (not required for saves)
    this.registry = new Map();
  }

  // ----------------------------
  // Key format (consistent)
  // ws:<type>:<zone>:<id>:<prop>
  // Example: ws:chest:gutterwake_east_canal:chest_001:opened
  // ----------------------------
  key(type, zone, id, prop) {
    return `ws:${type}:${zone}:${id}:${prop}`;
  }

  entityKey(type, zone, id) {
    return `${type}:${zone}:${id}`;
  }

  registerEntity({ type, zone, id, props = [] }) {
    const ek = this.entityKey(type, zone, id);
    this.registry.set(ek, { type, zone, id, props: Array.from(props) });
  }

  // ----------------------------
  // Generic bool access
  // ----------------------------
  getBool(type, zone, id, prop, defaultValue = false) {
    const k = this.key(type, zone, id, prop);
    if (this.flags.has(k)) return true;
    return !!defaultValue;
  }

  setBool(type, zone, id, prop, value = true) {
    const k = this.key(type, zone, id, prop);
    if (value) this.flags.add(k);
    else this.flags.delete(k);
  }

  // ----------------------------
  // Convenience helpers (common game objects)
  // ----------------------------
  isChestOpened(zone, chestId) {
    return this.getBool('chest', zone, chestId, 'opened', false);
  }

  setChestOpened(zone, chestId, opened = true) {
    this.setBool('chest', zone, chestId, 'opened', opened);
  }

  isNoticeRead(zone, noticeId) {
    return this.getBool('notice', zone, noticeId, 'read', false);
  }

  setNoticeRead(zone, noticeId, read = true) {
    this.setBool('notice', zone, noticeId, 'read', read);
  }

  isGateExamined(zone, gateId) {
    return this.getBool('gate', zone, gateId, 'examined', false);
  }

  setGateExamined(zone, gateId, examined = true) {
    this.setBool('gate', zone, gateId, 'examined', examined);
  }
}