import { OidcPage } from './app.po';

describe('oidc App', () => {
  let page: OidcPage;

  beforeEach(() => {
    page = new OidcPage();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('app works!');
  });
});
