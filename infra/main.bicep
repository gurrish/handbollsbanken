targetScope = 'resourceGroup'

@description('Short prefix used to name Azure resources.')
@minLength(3)
@maxLength(15)
param namePrefix string = 'handbollsbanken'

@description('Azure region for the storage account and Application Insights.')
param location string = resourceGroup().location

@description('Email addresses allowed to bootstrap as GlobalAdmin, comma-separated.')
param globalAdminEmails string = ''

var unique = uniqueString(subscription().id, resourceGroup().id)
var appName = '${namePrefix}-${unique}'
var storageAccountName = take(toLower(replace('${namePrefix}${unique}', '-', '')), 24)

module storage 'modules/storage.bicep' = {
  name: 'storage-${unique}'
  params: {
    accountName: storageAccountName
    location: location
  }
}

module insights 'modules/application-insights.bicep' = {
  name: 'insights-${unique}'
  params: {
    name: '${namePrefix}-appi-${unique}'
    location: location
  }
}

module staticWebApp 'modules/static-web-app.bicep' = {
  name: 'static-web-app-${unique}'
  params: {
    name: appName
    location: 'eastus2'
    storageAccountName: storage.outputs.accountName
    globalAdminEmails: globalAdminEmails
    applicationInsightsConnectionString: insights.outputs.connectionString
  }
}

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' existing = {
  #disable-next-line BCP334
  name: storageAccountName
}

var tableDataContributorRole = '0a9a7e1f-b9d0-4cc4-a60d-0319b160aaa3'
var blobDataContributorRole = 'ba92f5b4-2d11-453d-a403-e96b0029c9fe'

resource tableRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, storageAccountName, appName, tableDataContributorRole)
  scope: storageAccount
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', tableDataContributorRole)
    principalId: staticWebApp.outputs.principalId
    principalType: 'ServicePrincipal'
  }
}

resource blobRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, storageAccountName, appName, blobDataContributorRole)
  scope: storageAccount
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', blobDataContributorRole)
    principalId: staticWebApp.outputs.principalId
    principalType: 'ServicePrincipal'
  }
}

output staticWebAppName string = staticWebApp.outputs.name
output staticWebAppUrl string = staticWebApp.outputs.defaultHostname
output storageAccountName string = storage.outputs.accountName
