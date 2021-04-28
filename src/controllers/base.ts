import { Router } from 'express'

export interface BaseController {
  getRouter(): Router
}

export interface APIResponse<T> {
  data: T | T[]
}

export function responseBase<T>(payload: T | T[]): APIResponse<T> {
  return {
    data: payload,
  }
}