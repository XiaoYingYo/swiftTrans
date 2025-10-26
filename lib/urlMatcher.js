class ParamRule {
    constructor() {
        this.params = new Map();
    }
}
class PathNode {
    constructor() {
        this.children = new Map();
        this.paramRule = null;
        this.isPathWildcardEnd = false;
    }
}
class UrlMatcher {
    constructor() {
        this.roots = new Map();
    }
    getRules() {
        return this.roots;
    }
    addRule(ruleString) {
        try {
            const url = new URL(ruleString);
            const rootKey = url.host;
            if (!this.roots.has(rootKey)) {
                this.roots.set(rootKey, new PathNode());
            }
            let currentNode = this.roots.get(rootKey);
            const pathSegments = url.pathname.replace(/^\/|\/$/g, '').split('/').filter(p => p);
            for (let i = 0; i < pathSegments.length; i++) {
                const segment = pathSegments[i];
                if (!currentNode.children.has(segment)) {
                    currentNode.children.set(segment, new PathNode());
                }
                currentNode = currentNode.children.get(segment);
                if (segment === '*' && i === pathSegments.length - 1) {
                    currentNode.isPathWildcardEnd = true;
                }
            }
            const paramRule = new ParamRule();
            url.searchParams.forEach((value, key) => {
                paramRule.params.set(key, value);
            });
            currentNode.paramRule = paramRule;
        } catch (e) {
        }
    }
    matchUrl(urlString) {
        try {
            const url = new URL(urlString);
            const rootKey = url.host;
            if (!this.roots.has(rootKey)) {
                return false;
            }
            const rootNode = this.roots.get(rootKey);
            const pathSegments = url.pathname.replace(/^\/|\/$/g, '').split('/').filter(p => p);
            const finalNode = this._findMatchingNode(rootNode, pathSegments, 0);
            if (finalNode && finalNode.paramRule) {
                return this._matchParams(finalNode.paramRule, url.searchParams);
            }
            return false;
        } catch (e) {
            return false;
        }
    }
    _findMatchingNode(node, segments, index) {
        if (node.isPathWildcardEnd) {
            return node;
        }
        if (index === segments.length) {
            return node.paramRule ? node : null;
        }
        const segment = segments[index];
        const specificChild = node.children.get(segment);
        if (specificChild) {
            const result = this._findMatchingNode(specificChild, segments, index + 1);
            if (result) return result;
        }
        const wildcardChild = node.children.get('*');
        if (wildcardChild) {
            const result = this._findMatchingNode(wildcardChild, segments, index + 1);
            if (result) return result;
        }
        return null;
    }
    _matchParams(rule, urlParams) {
        for (const [ruleKey, ruleValue] of rule.params.entries()) {
            if (!urlParams.has(ruleKey)) {
                return false;
            }
            if (ruleValue !== '*' && urlParams.get(ruleKey) !== ruleValue) {
                return false;
            }
        }
        return true;
    }
}