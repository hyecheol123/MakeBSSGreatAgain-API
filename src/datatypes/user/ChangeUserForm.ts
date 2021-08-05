/**
 * Defien type for change user request from
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

/**
 * Interface for ChangeUserForm
 */
export default interface ChangeUserForm {
  nickname?: string;
  phoneNumber?: {
    countryCode: number;
    phoneNumber: number;
    opsType?: 'create' | 'update';
  };
  affiliation?: {schoolCompany: string; majorDepartment: string};
  emailChange?: {email: string; requestType: 'delete' | 'add'}[];
}
