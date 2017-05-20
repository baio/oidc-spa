import { Component, OnInit } from '@angular/core';
import { Log } from 'oidc-client';
import { OidcClientAuthService, expiresIn, expiringIn } from '../oidc-client-auth.service';

const utc = () => {
  return Math.floor(Date.now() / 1000);
}


const EXPIRING = 3550;

const KEYS = [
          {
            "kty": "RSA",
            "e": "AQAB",
            "use": "sig",
            "kid": "d0ec514a32b6f88c0abd12a2840699bdd3deba9d",
            "alg": "RS256",
            "n": "AJSn-hXW9Zzz9ORBKIC9Oi6wzM4zhqwHaKW2vZAqjOeLlpUW7zXwyk4tkivwsydPNaWUm-9oDlEAB2lsQJv7jwWNsF7SGx5R03kenC-cf8Nbxlxwa-Tncjo6uruEsK_Vke244KiSCHP8BOuHI-r5CS0x9edFLgesoYlPPFoJxTs5"
          }
        ];

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

  title = 'app works!';

  constructor(private auth: OidcClientAuthService) {

    Log.logger = console;
    Log.level = Log.INFO;


    const settings = {
      authority: 'https://wso.modeus.me/oauth2/authorize',
      client_id: 'on1YcWCWdTk9EW5zA0hOxxoRnPMa',
      redirect_uri: 'http://modeus-local-dev:4200',
      post_logout_redirect_uri: 'http://modeus-local-dev:4200',
      response_type: 'id_token',
      scope: 'openid profile',

      //metadataUrl: "https://wso.modeus.me/oauth2/oidcdiscovery/.well-known/openid-configuration",
      silent_redirect_uri:'http://modeus-local-dev:4200',
      //automaticSilentRenew:true,
      //silentRequestTimeout:10000,
      filterProtocolClaims: false,
       metadata: {
        issuer: "https://wso.modeus.me:9443/oauth2/token",
        authorization_endpoint: "https://wso.modeus.me/oauth2/authorize",
        end_session_endpoint: "https://wso.modeus.me/oidc/logout",
       },
       signingKeys : KEYS,
       accessTokenExpiringNotificationTime: 3400
    };

    this.auth.init(settings, EXPIRING);
  }

  ngOnInit() {

    this.auth.userChanged.subscribe(x => {

      console.log(">>>user changed", x.profile.exp, this.auth.isIFrame);

      this.showExpiresIn();
    })

    this.auth.entryPoint().then(x => {

      if (x && x.signinCallback) {

        location.hash = "";
      }
    });
  }

  showExpiresIn() {
    console.log(`Expires in: ${ expiresIn(this.auth.user) }, Expiring in: ${ expiringIn(this.auth.user, EXPIRING) }`);
  }

  get isLogin() {

    return !!this.auth.user;
  }

  login() {

    this.auth.signin();
  }

  logout() {

    this.auth.signout();
  }

  reset() {

    this.auth.user = null;
  }

  update() {

    this.auth.refreshSilent();

  }

  getToken() {

    this.auth.getToken(5000).then(x => console.log("---", this.auth.isIFrame, x));
  }


}
