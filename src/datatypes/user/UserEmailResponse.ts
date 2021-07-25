/**
 * Define type for the object contains UserEmail Information
 *
 * When look for email address information,
 * users do not need to get username information
 *
 * @author Hyecheol (Jerry) Jang
 */

/**
 * Interface for UserEmailResponse
 */
export default interface UserEmailResponse {
  email: string;
  primaryAddr: boolean;
  verified: boolean;
}
