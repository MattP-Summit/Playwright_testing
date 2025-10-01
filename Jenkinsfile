// Jenkins pipeline definition
pipeline {
    agent any

    environment {
        // Optionally define defaults (can be overridden by Jenkins job params)
        PROJECT_NAME = env.PROJECT_NAME ?: 'Playwright_testing'
    }

    stages {
        stage('Checkout') {
            steps {
                slackSend channel: '#deployments', message: "🚀 ${env.PROJECT_NAME} pipeline started by ${env.BUILD_USER ?: 'System'}\nCommit by: ${env.COMMIT_AUTHOR}"
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

        stage('Install Dependencies & Playwright') {
            steps {
                sh label: 'Install Node deps & browsers', script: '''
                    npm ci
                    npx playwright install --with-deps
                '''
            }
        }

        stage('Run Playwright Tests') {
            steps {
                script {
                    slackSend channel: '#deployments', message: "🔄 Running Playwright tests for ${env.PROJECT_NAME}\nCommit by: ${env.COMMIT_AUTHOR}"
                    sh label: 'Execute tests', script: '''
                        set -e
                        npx playwright test --reporter=list
                    '''
                }
            }
            post {
                always {
                    // Archive HTML report if generated
                    script {
                        // Generate HTML report explicitly (stored under playwright-report)
                        sh 'npx playwright show-report || true'
                        archiveArtifacts artifacts: 'playwright-report/**', fingerprint: true, allowEmptyArchive: true
                        publishHTML(target: [
                            reportName: 'Playwright Report',
                            reportDir: 'playwright-report',
                            reportFiles: 'index.html',
                            keepAll: true,
                            alwaysLinkToLastBuild: true,
                            allowMissing: true
                        ])
                    }
                }
            }
        }
    }

    post {
        always {
            script {
                def status = currentBuild.result ?: 'SUCCESS'
                if (status == 'SUCCESS') {
                    slackSend channel: '#deployments', message: "✅ ${env.PROJECT_NAME} pipeline completed successfully"
                } else if (status == 'FAILURE') {
                    slackSend channel: '#deployments', message: "❌ ${env.PROJECT_NAME} pipeline failed"
                } else if (status == 'ABORTED') {
                    slackSend channel: '#deployments', message: "🚫 ${env.PROJECT_NAME} pipeline aborted"
                } else {
                    slackSend channel: '#deployments', message: "ℹ️ ${env.PROJECT_NAME} pipeline finished with status: ${status}"
                }
            }
        }
    }
}

