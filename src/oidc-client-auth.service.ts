import { Injectable } from '@angular/core';

import { OidcClient, Log, OidcClientSettings, UserManager, User } from 'oidc-client';

import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';

const utc = () => {
  return Math.floor(Date.now() / 1000);
}

export const expiresIn = (user: User) =>
    user.profile["exp"] - utc();

export const expiringIn = (user: User, timeoutExpiring: number) =>
   expiresIn(user) - timeoutExpiring;

@Injectable()
export class OidcClientAuthService {

  constructor() {
  }

  private _user: User;
  private userManager: UserManager;

  private timeoutExpiringHandler: any;
  private timeoutExpiring: number;
  private requestExpiring: number;

  set user(user: User) {

    if (this._user !== user) {

      //clear previous timeout handler
      if (this.timeoutExpiringHandler) {

        clearTimeout(this.timeoutExpiringHandler);

        this.timeoutExpiringHandler = null;
      }

      if (user) {

        // if set up new loginned user set expiring token timeout
        const expIn = expiresIn(user);
        const expingIn = expiringIn(user, this.timeoutExpiring);

        //user loggined, start expiring timeout
        console.info(
          `User logined, start expiration timeout. Expires in ${ expIn } sec.
          Expiring event in ${ expingIn } sec. Is Iframe [${ this.isIFrame }] `);

        this.timeoutExpiringHandler = setTimeout(() => {

          console.info("Expiring, refresh token silently");

          this.refreshSilent();

        }, expingIn * 1000);

      }

      this._user = user;
      (<Subject<User>>this.userChanged).next(user);
    }
  }

  get user() {

    return this._user;
  }

  userChanged: Observable<User> = new Subject();

  init(settings: OidcClientSettings, timeoutExpiring: number = 60) {

    this.timeoutExpiring = timeoutExpiring;
    this.userManager = new UserManager(settings);

    this.userManager.events.addUserLoaded(user => {

        //user changed inside manager, update current user
        this.user = user;

    });

    this.userManager.events.addSilentRenewError(err => {

      console.info("addSilentRenewError", err);

      this.user = null;
    });

  }


  // Run this method on entry point of your app
  // 1. Check if this is signinCallback (has # in url), if so complete signin
  // 2. Trying to get user from app storage, if found returns one
  entryPoint() : Promise<null|{signinCallback: boolean, user: User}>{

      return this.checkSigninCallback().then(user => {

        if (user) {

          //this is signin callback, return user from callback
          return {signinCallback: true, user};

        } else {

          //not callback check if user in cache
          return this.userManager.getUser().then(user => {

            if (user) {

              this.user = user;

              return {signinCallback: false, user};
            } else {

              return null;
            }

          });
        }

      });

  }

  get isIFrame() { return window.self !== window.top; }


  checkSigninCallback() {

    if (!!location.href.split("#")[1]) {

      //Check if this is auth callback (via hash param)

      if (this.isIFrame) {

        //complete silent callback

        return this.userManager.signinSilentCallback().then(() => {

          console.info("iframe redirect");

          location.href = "";

          return this.userManager.getUser();

        });

      } else {

        return this.userManager.signinRedirectCallback().then(() => {

          return this.userManager.getUser();

        });
      }

    }

    return Promise.resolve(null);
  }

  /**
   * Check if user authorized and not expired, if expired then try to signin  silently.
   * If user not authorized, throw Error.\
   * @param slip sec (default 60).
   * if user authorized but token diff between now and expired is less than slip, will initiate silent token refresh
   * slip param should be grater than init::timeoutExpiring
   */
  getToken(slip = 180) {

    return this.userManager.getUser().then((user: User) => {

      if (user) {

        if (expiresIn(user) <= slip) {
          return this.refreshSilent().then(user => user.id_token);
        } else {
          return user.id_token;
        }
      } else {

        return Promise.reject(new Error("Unauthorized"))
      }
    });

  }

  signin() {

    return this.userManager.signinRedirect();
  }

  signout() {
    return this.userManager.signoutRedirect().then(() => {
      this.userManager.clearStaleState();
      this.user = null;
    })
  }

  refreshSilent() {

    return this.userManager.signinSilent();
  }

}