/**
 * Define type for new uer form
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

/**
 * Interface for NewUserForm
 */
export default interface NewUserForm {
  username: string;
  password: string;
  admissionYear: number;
  legalName: string; // Korean name
  nickname?: string;
  email: string;
  phoneNumber?: {countryCode: number; phoneNumber: number};
  affiliation?: {schoolCompany: string; majorDepartment: string};
}
