interface SignUpUserLike {
  identities?: unknown[] | null
}

export const isExistingEmailSignUp = (user: SignUpUserLike | null | undefined) => (
  Boolean(user) && Array.isArray(user?.identities) && user.identities.length === 0
)

