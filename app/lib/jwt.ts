/** Claims the NestJS backend signs into its access token. */
export interface JwtClaims {
  sub: string
  orgId: string
  exp?: number
  iat?: number
}

/** Decode (not verify) a JWT payload. Returns null for anything malformed. */
export function decodeJwt(token: string): JwtClaims | null {
  try {
    const part = token.split('.')[1]
    if (!part) return null
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=')
    const claims = JSON.parse(atob(b64)) as Partial<JwtClaims>
    return typeof claims.sub === 'string' ? (claims as JwtClaims) : null
  } catch {
    return null
  }
}

/** True when the token has an `exp` in the past (with a small clock-skew margin). */
export function isJwtExpired(claims: JwtClaims | null, skewSeconds = 30): boolean {
  if (!claims) return true
  return claims.exp !== undefined && claims.exp * 1000 <= Date.now() + skewSeconds * 1000
}
