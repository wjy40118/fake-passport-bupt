export interface Config {
    isRandomIdentityEnabled: boolean,
    isAnonymousAccessEnabled: boolean,
    alert: string,
    whitelist: AuthorizationFields[],
    isWhitelistEnabled: boolean
}

export interface AuthorizationFields {
    name: string,
    id: string,
    auth: string
}
