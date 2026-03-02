import { Octokit } from '@octokit/rest'
import { graphql } from '@octokit/graphql'
import { paginateRest } from '@octokit/plugin-paginate-rest'
import { retry } from '@octokit/plugin-retry'
import { throttling } from '@octokit/plugin-throttling'

const EnhancedOctokit = Octokit.plugin(paginateRest, retry, throttling)

export type GitHubClient = InstanceType<typeof EnhancedOctokit>

export interface GitHubClientBundle {
  rest: GitHubClient
  graphql: ReturnType<typeof graphql.defaults>
}

export const createGitHubClient = (token: string): GitHubClientBundle => {
  const auth = token.trim()
  if (!auth) {
    throw new Error('GitHub Token 不能为空')
  }

  const rest = new EnhancedOctokit({
    auth,
    request: {
      retries: 2
    },
    throttle: {
      onRateLimit: (retryAfter, options, octokit, retryCount) => {
        octokit.log.warn(
          `Rate limit hit for ${options.method} ${options.url}, retryAfter=${retryAfter}, retryCount=${retryCount}`
        )
        return retryCount < 1
      },
      onSecondaryRateLimit: (retryAfter, options, octokit) => {
        octokit.log.warn(
          `Secondary rate limit for ${options.method} ${options.url}, retryAfter=${retryAfter}`
        )
        return false
      }
    }
  })

  const graph = graphql.defaults({
    headers: {
      authorization: `token ${auth}`
    }
  })

  return {
    rest,
    graphql: graph
  }
}
