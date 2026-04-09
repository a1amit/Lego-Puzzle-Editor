import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ApiClient } from '@/services/apiClient'

let client: ApiClient

beforeEach(() => {
  client = new ApiClient()
  vi.mocked(globalThis.fetch).mockReset()
})

// Helper to create a mock Response
function mockResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('ApiClient', () => {
  describe('get', () => {
    it('returns parsed JSON on success', async () => {
      const data = { id: 1, name: 'test-puzzle' }
      vi.mocked(globalThis.fetch).mockResolvedValueOnce(mockResponse(data))

      const result = await client.get('/puzzles/1')

      expect(result).toEqual(data)
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/puzzles/1', {
        headers: { 'Content-Type': 'application/json' },
      })
    })

    it('throws with error message from response body', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce(
        mockResponse({ error: 'Puzzle not found' }, 404),
      )

      await expect(client.get('/puzzles/999')).rejects.toThrow('Puzzle not found')
    })

    it('adds Authorization header when token provider is set', async () => {
      client.setTokenProvider(async () => 'my-token-123')
      vi.mocked(globalThis.fetch).mockResolvedValueOnce(mockResponse({ ok: true }))

      await client.get('/protected')

      expect(globalThis.fetch).toHaveBeenCalledWith('/api/protected', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer my-token-123',
        },
      })
    })
  })

  describe('post', () => {
    it('sends POST with JSON body', async () => {
      const requestBody = { title: 'New Puzzle', difficulty: 'easy' }
      const responseData = { id: '42', ...requestBody }
      vi.mocked(globalThis.fetch).mockResolvedValueOnce(mockResponse(responseData))

      const result = await client.post('/puzzles', requestBody)

      expect(result).toEqual(responseData)
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/puzzles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })
    })

    it('sends POST without body when none provided', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce(mockResponse({ success: true }))

      await client.post('/puzzles/1/publish')

      expect(globalThis.fetch).toHaveBeenCalledWith('/api/puzzles/1/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: undefined,
      })
    })
  })

  describe('patch', () => {
    it('sends PATCH with JSON body', async () => {
      const requestBody = { title: 'Updated Title' }
      const responseData = { id: '42', title: 'Updated Title' }
      vi.mocked(globalThis.fetch).mockResolvedValueOnce(mockResponse(responseData))

      const result = await client.patch('/puzzles/42', requestBody)

      expect(result).toEqual(responseData)
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/puzzles/42', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })
    })
  })

  describe('setTokenProvider', () => {
    it('provides auth token in headers for all request methods', async () => {
      client.setTokenProvider(async () => 'session-token-abc')
      vi.mocked(globalThis.fetch)
        .mockResolvedValueOnce(mockResponse({ ok: true }))
        .mockResolvedValueOnce(mockResponse({ ok: true }))
        .mockResolvedValueOnce(mockResponse({ ok: true }))

      await client.get('/test')
      await client.post('/test', { data: 1 })
      await client.patch('/test', { data: 2 })

      const expectedHeaders = {
        'Content-Type': 'application/json',
        Authorization: 'Bearer session-token-abc',
      }

      for (const call of vi.mocked(globalThis.fetch).mock.calls) {
        expect(call[1]).toMatchObject({ headers: expectedHeaders })
      }
    })

    it('omits Authorization header when token provider returns null', async () => {
      client.setTokenProvider(async () => null)
      vi.mocked(globalThis.fetch).mockResolvedValueOnce(mockResponse({ ok: true }))

      await client.get('/test')

      expect(globalThis.fetch).toHaveBeenCalledWith('/api/test', {
        headers: { 'Content-Type': 'application/json' },
      })
    })
  })

  describe('no token provider', () => {
    it('omits Authorization header when no token provider is set', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce(mockResponse({ ok: true }))

      await client.get('/public')

      expect(globalThis.fetch).toHaveBeenCalledWith('/api/public', {
        headers: { 'Content-Type': 'application/json' },
      })
    })
  })

  describe('error responses', () => {
    it('throws with error message from response body', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce(
        mockResponse({ error: 'Unauthorized access' }, 401),
      )

      await expect(client.get('/secret')).rejects.toThrow('Unauthorized access')
    })

    it('throws generic message when body has no error field', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce(
        mockResponse({ message: 'something else' }, 500),
      )

      await expect(client.get('/broken')).rejects.toThrow('Request failed: 500')
    })

    it('throws generic message when response body is not valid JSON', async () => {
      const badResponse = new Response('not json', {
        status: 502,
        headers: { 'Content-Type': 'text/plain' },
      })
      vi.mocked(globalThis.fetch).mockResolvedValueOnce(badResponse)

      await expect(client.get('/bad-gateway')).rejects.toThrow('Request failed: 502')
    })

    it('throws with error from POST response', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce(
        mockResponse({ error: 'Validation failed' }, 422),
      )

      await expect(client.post('/puzzles', {})).rejects.toThrow('Validation failed')
    })

    it('throws with error from PATCH response', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce(
        mockResponse({ error: 'Not found' }, 404),
      )

      await expect(client.patch('/puzzles/99', {})).rejects.toThrow('Not found')
    })
  })
})
