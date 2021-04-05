// eslint-disable-next-line  @typescript-eslint/no-explicit-any
export type AsyncHandlerResponse = Promise<any>

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
export type HandlerResponse = any

// eslint-disable-next-line @typescript-eslint/ban-types
export type Optional<T extends object, K extends keyof T = keyof T> = Omit<T, K> & Partial<Pick<T, K>>
