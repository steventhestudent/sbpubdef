from azure_function.sbpubdef.local_upload import authenticate, send_email

authenticate()
# sender_upn options:  shared mailbox, “service account” mailbox (recommended for apps, but requires license), send as existing user
send_email('sgonzales@csproject25.onmicrosoft.com', 'test (subject)', 'test (body)', sender_upn="sbpubdef@csproject25.onmicrosoft.com")
