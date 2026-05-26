import { authHeaders, hasAccessToken } from './auth'
import { createApiError, parseResponseBody } from './apiError'

export async function fetchAdminDashboard() {
  if (!hasAccessToken()) {
    const err = new Error('로그인이 필요합니다.')
    err.status = 401
    throw err
  }
  const res = await fetch('/api/admin/dashboard', {
    headers: authHeaders(),
  })
  const raw = await res.text()
  const data = parseResponseBody(raw)
  if (!res.ok) {
    throw createApiError(res, data)
  }
  return data
}

export async function fetchAdminTeachers() {
  if (!hasAccessToken()) {
    const err = new Error('로그인이 필요합니다.')
    err.status = 401
    throw err
  }
  const res = await fetch('/api/admin/teachers', {
    headers: authHeaders(),
  })
  const raw = await res.text()
  const data = parseResponseBody(raw)
  if (!res.ok) {
    throw createApiError(res, data)
  }
  return Array.isArray(data) ? data : []
}

export async function createAdminTeacher(payload) {
  if (!hasAccessToken()) {
    const err = new Error('로그인이 필요합니다.')
    err.status = 401
    throw err
  }
  const res = await fetch('/api/admin/teachers', {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  })
  const raw = await res.text()
  const data = parseResponseBody(raw)
  if (!res.ok) {
    throw createApiError(res, data)
  }
  return data
}
