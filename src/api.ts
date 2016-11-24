import * as request from 'request';

const conf = require('../.config/global.json');
const keys = require('../.config/keys.json');

export namespace Api {

  /**
   *
   */
  interface RequestParams {
    limit: number;
    pageAfter?: number;
  }

  /**
   * @private
   *
   * Extract a parameter value from a url.
   *
   * @param name The parameter name
   * @param url  A valid url string
   *
   * @return The value of the name parameter, if present in the url string.
   */
  let getUrlParam = (name: string, url: string): string => {
    name = name.replace(/[\[\]]/g, '\\$&');
    const results = (new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`)).exec(url);
    return results[2] ? decodeURIComponent(results[2].replace(/\+/g, ' ')) : '';
  }

  /**
   * @private
   *
   * Return a well-formed VOTO API url for to the provided endpoint uri and
   * request parameters.
   *
   * @param endpoint {string}        A valid VOTO API endpoint uri
   * @param params   {RequestParams} GET request parameters
   *
   * @return A url string which is valid for interacting with the VOTO API.
   */
  let votoUrl = (endpoint: string, {limit, pageAfter}: RequestParams): string => {
    let url = conf.voto.api.replace(/\/$/g, '') // strip trailing slash
      + '/' + endpoint.replace(/^\//g, '')      // strip leading slash
      + '?api_key=' + keys.default
      + '&limit='   + limit;
    if (undefined !== typeof pageAfter) {
      url += '&page_after=' + pageAfter;
    }
    return url;
  }

  /**
   *
   */
  export function get(endpoint: string, params: RequestParams = {limit: 20}): Promise<any> {
    return new Promise((resolve, reject) => {
      const url = votoUrl(endpoint, params);
      console.log(url);
      request.get(url, (error, response, body) => {
        if (error) {
          reject(error);
        } else {
          try {
            resolve(response);
          } catch(err) {
            reject(err);
          }
        }
      });
    });
  }

  interface Callback {
    (any): void;
  }

  /**
   *
   */
  export function stream(endpoint: string, send: Callback, chunkSize: number = 20): void {
    let fetch = (params: RequestParams): void => {
      get(endpoint, params).then(response => {
        const body = JSON.parse(response.body);
        send(body);
        if (body.pagination.nextURL) {
          const after = getUrlParam('page_after', body.pagination.nextURL);
          fetch({
            limit: chunkSize, 
            pageAfter: Number(after)
          });
        }
      });
    }
    fetch({limit: chunkSize});
  }

}
