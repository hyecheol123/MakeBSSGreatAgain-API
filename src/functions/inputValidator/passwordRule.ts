/**
 * Method to check password rule
 *  - Contains at least one number, one small/large character, and one symbol
 *  - Only allow !@#$%^&*-+= for the symbol
 *  - Password Cannot Contains 3 consecutive/same letters in a row
 *  - Password Cannot Contains 3 consecutive letters appears in id
 *  - Password Cannot Contains 3 consecutive letters in reversed order appears in id
 *  - At least 10 character long, Maximum 50 character
 *
 * @param username username of the user
 * @param password password the user attempts to use
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */
export default function passwordRule(
  username: string,
  password: string
): boolean {
  const passwordRegExp =
    /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*\-+=])[a-zA-Z0-9!@#$%^&*\-+=]{10,50}$/;
  const notAllowedRegExp = /[^0-9a-zA-Z!@#$%^&*\-+=]/;

  // Check whether the password contains not allowed characters
  if (notAllowedRegExp.test(password)) {
    return false;
  }
  // Check Rule 1, 2, 6
  if (!passwordRegExp.test(password)) {
    return false;
  }

  const lowPW = password.toLowerCase();
  const lowUsername = username.toLowerCase();
  for (let i = 0; i < password.length - 2; i += 1) {
    // Password Cannot Contains 3 consecutive/same letters in a row
    if (
      lowPW.charCodeAt(i) - lowPW.charCodeAt(i + 1) === 1 &&
      lowPW.charCodeAt(i + 1) - lowPW.charCodeAt(i + 2) === 1
    ) {
      return false;
    } else if (
      lowPW.charCodeAt(i) - lowPW.charCodeAt(i + 1) === -1 &&
      lowPW.charCodeAt(i + 1) - lowPW.charCodeAt(i + 2) === -1
    ) {
      return false;
    } else if (
      lowPW.charCodeAt(i) === lowPW.charCodeAt(i + 1) &&
      lowPW.charCodeAt(i + 1) === lowPW.charCodeAt(i + 2)
    ) {
      return false;
    }

    for (let idIndex = 0; idIndex < lowUsername.length - 2; idIndex += 1) {
      let testString = lowUsername.substring(idIndex, idIndex + 3);
      // Password Cannot Contains 3 consecutive letters appears in id
      if (lowPW.includes(testString)) {
        return false;
      }
      // Password Cannot Contains 3 consecutive letters in reversed order appears in id
      testString = testString.split('').reverse().join('');
      if (lowPW.includes(testString)) {
        return false;
      }
    }
  }
  return true;
}
