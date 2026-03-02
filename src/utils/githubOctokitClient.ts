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

export interface GitHubRequestErrorLike extends Error {
  status?: number
  response?: {
    data?: {
      message?: string
    }
  }
}

export const createGitHubClient = (token = ''): GitHubClientBundle => {
  const auth = token.trim()

  const rest = new EnhancedOctokit({
    ...(auth ? { auth } : {}),
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

  const graph = graphql.defaults(
    auth
      ? {
          headers: {
            authorization: `token ${auth}`
          }
        }
      : {}
  )

  return {
    rest,
    graphql: graph
  }
}

export const normalizeGitHubError = (error: unknown): GitHubRequestErrorLike => {
  const fallback = new Error('GitHub 请求失败') as GitHubRequestErrorLike
  if (!error || typeof error !== 'object') return fallback
  const casted = error as GitHubRequestErrorLike
  const status = casted.status
  const responseMessage = casted.response?.data?.message
  const message = responseMessage || casted.message || fallback.message
  const normalized = new Error(message) as GitHubRequestErrorLike
  if (typeof status === 'number') {
    normalized.status = status
  }
  if (casted.response) {
    normalized.response = casted.response
  }
  return normalized
}
