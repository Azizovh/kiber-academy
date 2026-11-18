declare module 'virtual:lesson-meta' {
  const meta: Record<string, { readMinutes: number; quiz: number; cards: number }>;
  export default meta;
}
