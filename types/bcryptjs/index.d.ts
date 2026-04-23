declare module 'bcryptjs' {
  export function genSaltSync(rounds?: number): string
  export function hashSync(data: string, saltOrRounds: string | number): string
  export function compareSync(data: string, encrypted: string): boolean
  const bcrypt: {
    genSaltSync: typeof genSaltSync
    hashSync: typeof hashSync
    compareSync: typeof compareSync
  }
  export default bcrypt
}
