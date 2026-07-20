import type { User } from '../entities';

export type InitialAdminBootstrapResult =
  | {
      status: 'admin-already-exists';
    }
  | {
      status: 'created';
      user: User;
    };
