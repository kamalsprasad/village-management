# Server Functions for Village Management System

This directory contains Appwrite server-side functions for the Village Management System.

## Directory Structure

```
server/
├── functions/
│   └── checkUsersExist.js    # Function to check if any users exist in the system
├── .env                       # Environment variables (not committed to git)
├── package.json               # Node.js dependencies
└── README.md                  # This file
```

## Available Functions

### 1. checkUsersExist

**Purpose**: Securely check if any users exist in the Appwrite authentication system.

**Location**: `functions/checkUsersExist.js`

**Required Scopes**: `users.read`

**Execute Access**: `role:guest` (allows unauthenticated users to call it)

**Use Case**: Determines whether to show the "Create Admin" form or "Login" form on first app launch.

**Deployment Instructions**: See `../appwrite_setup/FUNCTION_DEPLOYMENT.md`

## Environment Variables

The `.env` file in this directory contains server-side environment variables for Appwrite Functions:

```env
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your-project-id
APPWRITE_API_KEY=your-api-key-with-users-read-scope
```

**Security Note**: The `.env` file is gitignored and should never be committed to version control.

## Dependencies

- `node-appwrite`: Official Appwrite SDK for Node.js server-side operations

Install dependencies:
```bash
npm install
```

## Development

### Testing Functions Locally

You can test functions locally using the Appwrite CLI:

```bash
# Install Appwrite CLI globally
npm install -g appwrite-cli@16.0.0

# Login to Appwrite
appwrite login

# Deploy function
appwrite deploy function
```

### Function Structure

All functions follow the Appwrite Function signature:

```javascript
export default async ({ req, res, log, error }) => {
  // Function logic here
  return res.json({ success: true, data: {} });
};
```

## Deployment

See the comprehensive deployment guide at:
`../appwrite_setup/FUNCTION_DEPLOYMENT.md`

Quick deployment steps:
1. Create API key with required scopes in Appwrite Console
2. Create function in Appwrite Console
3. Configure environment variables
4. Deploy function code (via CLI or manual upload)
5. Set execute permissions to `role:guest`
6. Update client `.env` with function ID

## Security Best Practices

1. **API Keys**: Never commit API keys to version control
2. **Scopes**: Only grant minimum required scopes to API keys
3. **Execute Access**: Only grant `role:guest` access when absolutely necessary
4. **Environment Variables**: Store sensitive data in Appwrite's environment variables
5. **Validation**: Always validate inputs in functions
6. **Error Handling**: Never expose sensitive error details to clients

## Monitoring

Monitor function execution in Appwrite Console:
- Navigate to Functions → [Function Name] → Logs
- Check execution count, errors, and response times
- Set up alerts for failures if needed

## Troubleshooting

### Common Issues

1. **Function returns 500 error**
   - Check API key has correct scopes
   - Verify environment variables are set
   - Check function logs for detailed errors

2. **Permission denied**
   - Ensure `role:guest` is added to Execute Access
   - Verify API key has required permissions

3. **Function not found**
   - Check function ID in client `.env` matches deployed function
   - Ensure function is deployed and active

## Additional Resources

- [Appwrite Functions Documentation](https://appwrite.io/docs/products/functions)
- [Appwrite Node.js SDK](https://appwrite.io/docs/sdks#server)
- [Appwrite CLI Documentation](https://appwrite.io/docs/tooling/command-line/installation)

---

**Last Updated**: 2025-10-26  
**Maintainer**: Kamal S. Prasad
