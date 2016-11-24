import * as request from 'request';
import * as http    from 'http';

const conf = require('../.config/global.json');
const keys = require('../.config/keys.json');

export namespace Api {

  /**
   * A formatted API response with the [http.IncomingMessage]{@link https://nodejs.org/api/http.html#http_class_http_incomingmessage}
   * object and the parsed response body.
   */
  export interface Response {

    /**
     * Complete response object with status, headers and data.
     *
     * @see {@link https://nodejs.org/api/http.html#http_class_http_incomingmessage}
     */
    all: http.IncomingMessage;

    /**
     * Parsed response body.
     */
    body: any;
  }

  /**
   * Generic GET request parameters for interacting with the VOTO API.
   */
  export interface RequestParams {

    /**
     * The maximum number of data objects that are returned in a request
     */
    limit: number;

    /**
     * Before threshold for traversing results spanning across multiple pages.
     */
    pageBefore?: number;

    /**
     * After threshold for traversing results spanning across multiple pages.
     */
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
   * @return The value of the `name` parameter, if present in the url string
   */
  let getUrlParam = (name: string, url: string): string => {
    name = name.replace(/[\[\]]/g, '\\$&');
    const results = (new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`)).exec(url);
    return results[2] ? decodeURIComponent(results[2].replace(/\+/g, ' ')) : '';
  }

  /**
   * @private
   *
   * Return a well-formed url for to the provided VOTO API endpoint uri and
   * request parameters.
   *
   * @param endpoint A VOTO endpoint uri
   * @param params   GET request parameters
   *
   * @return A url which is valid for interacting with the VOTO API
   */
  let votoUrl = (endpoint: string, params: RequestParams): string => {
    const {limit, pageAfter, pageBefore} = params;
    let url = conf.voto.api.replace(/\/$/g, '') // strip trailing slash
      + '/' + endpoint.replace(/^\//g, '')      // strip leading slash
      + '?api_key=' + keys.default
      + '&limit='   + limit;
    if ('undefined' !== typeof pageAfter) {
      url += '&page_after=' + pageAfter;
    } else if ('undefined' !== typeof pageBefore) {
      url += '&page_before=' + pageBefore;
    }
    return url;
  }

  /**
   * Send a GET request to the VOTO API.
   *
   * @param endpoint VOTO endpoint uri
   * @param params   GET request parameters
   *
   * @return A Promise with the response object
   */
  export function get(endpoint: string, params: RequestParams = {limit: 20}): Promise<Response> {
    return new Promise((resolve, reject) => {
      const url = votoUrl(endpoint, params);
      console.log(url);
      request.get(url, (error, response, body) => {
        if (error) {
          reject(error);
        } else {
          try {
            resolve({ all: response, body: JSON.parse(body) });
          } catch(err) {
            reject(err);
          }
        }
      });
    });
  }

  /**
   * Streaming (chunked) response callback
   */
  interface Callback {
    (res: Response): void;
  }

  /**
   * Perform a sequence of progressive requests to the VOTO API `endpoint` by
   * following the nextURL parameter in each response, and pass response in 
   * chunks of size no larger than `chunkSize` to the provided callback.
   *
   * @param endpoint  VOTO endpoint uri
   * @param send      A callback to receive the data as it comes in
   * @param chunkSize The size of each response
   */
  export function stream(endpoint: string, send: Callback, chunkSize: number = 20): void {
    let fetch = (params: RequestParams): void => {
      get(endpoint, params).then((res: Response) => {
        send(res);
        if (res.body.pagination.nextURL) {
          const after = getUrlParam('page_after', res.body.pagination.nextURL);
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
