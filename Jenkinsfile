// Jenkins pipeline definition
pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                slackSend channel: '#deployments',
                         message: "🚀 ${env.PROJECT_NAME} deployment started by ${env.BUILD_USER ?: 'System'}.\n" +
                                 "Commit by: ${env.COMMIT_AUTHOR}" 

                checkout([
                    $class: 'GitSCM',
                    branches: [[name: '*/main']],
                    userRemoteConfigs: [[
                        url: 'https://github.com/summit-interconnect/Playwright_testing',
                        credentialsId: 'github-credentials'
                    ]]
                ])
            }
        }

       stage('Install & Init Playwright') {
            steps {
                sh '''
                    npm ci

                    npm init playwright@latest --yes -- --tests-dir=tests --no-gha

                    npx playwright install --with-deps
                '''
            }
        }

        stage('Run Report Tests') {
            steps {
                script {
                    slackSend channel: '#deployments',
                             message: "🔄 Running PowerBI Report Tests for ${env.PROJECT_NAME}...\n" +
                                     "Commit by: ${env.COMMIT_AUTHOR}"

                    sh '''
                        cd tests
                        npm init playwright@latest --yes -- --tests-dir=tests --no-gha
                    '''

                    slackSend channel: '#deployments',
                             message: "✅ ${env.PROJECT_NAME} deployment to STAGING environment completed.\n" +
                                     "Image: ${imageTagFull}\n" +
                                     "WebApp: ${webAppName}\n" +
                                     "Commit by: ${env.COMMIT_AUTHOR}\n" +
                                     "JIRA: ${env.JIRA_LINK}"
                }
            }
        }
    }
    
    post {
        always {
            script {

                // Final notification
                if (currentBuild.result == 'SUCCESS') {
                        slackSend channel: '#deployments',
                                 message: """
                                    ✅ ${env.PROJECT_NAME} deployment pipeline completed successfully!     
                                 """
                    } else if (currentBuild.result == 'FAILURE') {
                        slackSend channel: '#deployments',
                                 message: """
                                    ❌ ${env.PROJECT_NAME} deployment pipeline has failed.
                                 """
                    } else if (currentBuild.result == 'ABORTED') {
                        slackSend channel: '#deployments',
                                 message: "🚫 ${env.PROJECT_NAME} deployment pipeline has been aborted." +

                }
            }
        }
    }
}
