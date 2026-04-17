function definePropertyIfMissing<T extends object, K extends PropertyKey>(
  target: T,
  key: K,
  value: PropertyDescriptor["value"]
) {
  if (key in target) {
    return;
  }

  Object.defineProperty(target, key, {
    configurable: true,
    writable: true,
    value
  });
}

function installArrayAtPolyfill() {
  definePropertyIfMissing(Array.prototype, "at", function at<T>(this: T[], index: number) {
    const length = this.length >>> 0;
    const normalizedIndex = Math.trunc(index) || 0;
    const resolvedIndex = normalizedIndex >= 0 ? normalizedIndex : length + normalizedIndex;

    if (resolvedIndex < 0 || resolvedIndex >= length) {
      return undefined;
    }

    return this[resolvedIndex];
  });
}

function installArrayFlatMapPolyfill() {
  definePropertyIfMissing(
    Array.prototype,
    "flatMap",
    function flatMap<T, U>(
      this: T[],
      callback: (value: T, index: number, array: T[]) => U | U[],
      thisArg?: unknown
    ) {
      const mapped = this.map((value, index, array) => callback.call(thisArg, value, index, array));
      const flattened: U[] = [];

      for (const item of mapped) {
        if (Array.isArray(item)) {
          flattened.push(...item);
        } else {
          flattened.push(item);
        }
      }

      return flattened;
    }
  );
}

function installObjectFromEntriesPolyfill() {
  definePropertyIfMissing(Object, "fromEntries", function fromEntries<K extends PropertyKey, V>(
    entries: Iterable<readonly [K, V]>
  ) {
    const result: Record<PropertyKey, V> = {};

    for (const [key, value] of entries) {
      result[key] = value;
    }

    return result;
  });
}

function installStringMatchAllPolyfill() {
  definePropertyIfMissing(
    String.prototype,
    "matchAll",
    function matchAll(this: string, expression: RegExp | string) {
      const sourceExpression =
        expression instanceof RegExp ? expression : new RegExp(String(expression), "g");
      const flags = sourceExpression.flags.includes("g")
        ? sourceExpression.flags
        : `${sourceExpression.flags}g`;
      const matcher = new RegExp(sourceExpression.source, flags);
      const source = String(this);

      return {
        [Symbol.iterator]() {
          return this;
        },
        next() {
          const nextMatch = matcher.exec(source);

          if (!nextMatch) {
            return {
              done: true,
              value: undefined
            };
          }

          return {
            done: false,
            value: nextMatch
          };
        }
      };
    }
  );
}

export function installBrowserCompatPolyfills() {
  installArrayAtPolyfill();
  installArrayFlatMapPolyfill();
  installObjectFromEntriesPolyfill();
  installStringMatchAllPolyfill();
}
