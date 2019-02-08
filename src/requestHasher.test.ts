import { HasherRequest, requestHasher } from './requestHasher'

const defaultRequest = {
  url: 'http://google.com/',
  headers: { foo: 'bar' },
  httpVersion: '1.1',
  method: 'GET',
  trailers: { bar: 'foo' }
}

describe('requestHasher', () => {
  test('hash with same query is the same', () => {
    const hasher = requestHasher()
    const req1: HasherRequest = {
      ...defaultRequest,
      url: 'http://google.com/?foo=bar&asd=qwe'
    }
    const req2 = { ...defaultRequest, url: 'http://google.com/?asd=qwe&foo=bar' }
    expect(hasher(req1)).toEqual(hasher(req2))
  })

  test('hash with same headers is the same', () => {
    const hasher = requestHasher()
    const req1: HasherRequest = {
      ...defaultRequest,
      headers: { foo: 'bar', bar: 'foo' }
    }
    const req2 = { ...defaultRequest, headers: { foo: 'bar', bar: 'foo' } }
    expect(hasher(req1)).toEqual(hasher(req2))
  })

  test('hash with same trailers is the same', () => {
    const hasher = requestHasher()
    const req1: HasherRequest = {
      ...defaultRequest,
      trailers: { foo: 'bar', bar: 'foo' }
    }
    const req2 = { ...req1, trailers: { foo: 'bar', bar: 'foo' } }
    expect(hasher(req1)).toEqual(hasher(req2))
  })

  test('handles different method', () => {
    const hasher = requestHasher()
    const req1: HasherRequest = {
      ...defaultRequest,
      method: 'GET'
    }
    const req2 = { ...defaultRequest, method: 'POST' }
    expect(hasher(req1)).not.toEqual(hasher(req2))
  })

  test('handle different pathnames', () => {
    const hasher = requestHasher()
    const req1: HasherRequest = {
      ...defaultRequest,
      url: 'http://google.com/foo'
    }
    const req2 = { ...defaultRequest, url: 'http://google.com/bar' }
    expect(hasher(req1)).not.toEqual(hasher(req2))
  })

  test('handle different bodies', () => {
    const hasher = requestHasher()
    const body1 = Buffer.concat([Buffer.from('CHON'), Buffer.from('MAGUE')])
    const body2 = Buffer.from('POTATO')
    expect(hasher(defaultRequest, body1)).not.toEqual(hasher(defaultRequest, body2))
  })

  test('handle same body in different chunks', () => {
    const hasher = requestHasher()
    const body1 = Buffer.concat([Buffer.from('CHON'), Buffer.from('MAGUE')])
    const body2 = Buffer.from('CHONMAGUE')
    expect(hasher(defaultRequest, body1)).toEqual(hasher(defaultRequest, body2))
  })
})
