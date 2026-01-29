import { devices } from '@/db/schema/devices';
import { otpChallenges } from '@/db/schema/otpChallenges';
import { oauthStates } from '@/db/schema/oauthStates';
import { policies } from '@/db/schema/policies';
import { relationships } from '@/db/schema/relationships';
import { sessions } from '@/db/schema/sessions';
import { userIdentities } from '@/db/schema/userIdentities';
import { users } from '@/db/schema/users';

export { devices } from '@/db/schema/devices';
export { otpChallenges } from '@/db/schema/otpChallenges';
export { oauthStates } from '@/db/schema/oauthStates';
export { policies } from '@/db/schema/policies';
export { relationships } from '@/db/schema/relationships';
export { sessions } from '@/db/schema/sessions';
export { userIdentities, type IdentityType } from '@/db/schema/userIdentities';
export { users } from '@/db/schema/users';

export const schema = {
  users,
  userIdentities,
  otpChallenges,
  oauthStates,
  devices,
  sessions,
  relationships,
  policies,
};
