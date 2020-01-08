const fs = require('fs').promises
const FILE = `${__dirname}/../cache.json`
const { LoggerFactory } = require('logger.js')
const logger = LoggerFactory.getLogger('cache', 'blue')

/**
 * @typedef CacheData
 * @property {number} expiresAfter
 * @property {number} lastUpdated
 * @property {any} value
 */

/**
 * Provides static cache methods.
 */
class Cache {
  cache = null

  static async loadFile() {
    await Cache.checkFile()
    this.cache = JSON.parse(await fs.readFile(FILE, 'utf-8'))
    return this.cache
  }

  static async checkFile() {
    await fs.stat(FILE).catch(async () => {
      logger.info('Creating new empty cache.')
      await fs.writeFile(FILE, '{}')
    })
  }

  /**
   * @returns {Promise<{[id: string]: CacheData}>}
   */
  static async getCacheData() {
    if (this.cache == null) return await this.loadFile()
    return this.cache
  }

  /**
   * Set cache data. It will override existing value if it already found.
   * @param {string} key
   * @param {any} value any value
   * @param {number} expiresAfter in milliseconds
   */
  static setCache(key, value, expiresAfter) {
    this.cache[key] = { value: value, expiresAfter: Date.now() + expiresAfter, lastUpdated: Date.now() }
  }

  /**
   * Invalidates cache.
   * @param {string} key 
   */
  static invalidateCache(key) {
    delete this.cache[key]
  }

  /**
   * Get cache value.
   * To check if it exists, use Cache#exists(key).
   * @param {string} key 
   * @returns {any} cache if found null otherwise
   */
  static getCache(key) {
    const data = this.cache[key]
    if (data && data.expiresAfter < Date.now() || data.value === undefined) Cache.invalidateCache(key)
    return data ? data.value : null
  }

  /**
   * Get cache value.
   * To check if it exists, use Cache#exists(key).
   * @param {string} key 
   * @returns {CacheData} cache if found null otherwise
   */
  static getRawCache(key) {
    const data = this.cache[key]
    if (data && data.expiresAfter < Date.now() || data.value === undefined) Cache.invalidateCache(key)
    return data
  }

  /**
   * Checks if key exists in the cache.
   * @param {string} key
   * @returns {boolean}
   */
  static exists(key) {
    const data = this.cache[key]
    if (data && data.expiresAfter < Date.now() || data === undefined || data.value === undefined) Cache.invalidateCache(key)
    return !!this.cache[key] // response: nO
  }

  /**
   * Deletes all cache even if their expire date hasn't elapsed yet.
   */
  static clearCache() {
    this.cache = {}
  }

  static async save() {
    return await fs.writeFile(FILE, JSON.stringify(this.cache))
  }
}

module.exports = Cache
