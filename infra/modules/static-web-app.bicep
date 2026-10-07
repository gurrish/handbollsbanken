param name string
param location string
param storageAccountName string
param globalAdminEmails string
param applicationInsightsConnectionString string
@secure()
param googleClientId string = ''
@secure()
param googleClientSecret string = ''

resource staticWebApp 'Microsoft.Web/staticSites@2022-09-01' = {
  name: name
  location: location
  sku: {
    name: 'Standard'
    tier: 'Standard'
  }
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    stagingEnvironmentPolicy: 'Enabled'
  }
}

resource authSettings 'Microsoft.Web/staticSites/config@2022-09-01' = {
  parent: staticWebApp
  name: 'appsettings'
  kind: 'appsettings'
  properties: {
    GOOGLE_CLIENT_ID: googleClientId
    GOOGLE_CLIENT_SECRET: googleClientSecret
  }
}

resource functionSettings 'Microsoft.Web/staticSites/config@2022-09-01' = {
  parent: staticWebApp
  name: 'functionappsettings'
  kind: 'functionappsettings'
  properties: {
    STORAGE_MODE: 'table'
    STORAGE_ACCOUNT_NAME: storageAccountName
    GLOBAL_ADMIN_EMAILS: globalAdminEmails
    APPLICATIONINSIGHTS_CONNECTION_STRING: applicationInsightsConnectionString
  }
}

output name string = staticWebApp.name
output defaultHostname string = staticWebApp.properties.defaultHostname
output principalId string = staticWebApp.identity.principalId
