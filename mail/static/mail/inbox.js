document.addEventListener("DOMContentLoaded", function () {
  // Use buttons to toggle between views
  document
    .querySelector("#inbox")
    .addEventListener("click", () => load_mailbox("inbox"))
  document
    .querySelector("#sent")
    .addEventListener("click", () => load_mailbox("sent"))
  document
    .querySelector("#archive")
    .addEventListener("click", () => load_mailbox("archive"))
  document.querySelector("#compose").addEventListener("click", compose_email)
  document.querySelector("#compose-form").addEventListener("submit", send_email)

  // By default, load the inbox
  load_mailbox("inbox")
})

function compose_email() {
  // Show compose view and hide other views
  let form = document.querySelector("#compose-view")
  form.style.display = "block"
  document.getElementById("mailbox-view").style.display = "none"
  document.getElementById("single-email-view").style.display = "none"

  form.querySelector("h3").textContent = "New Email"

  // Clear out composition fields
  form.querySelector("#compose-recipients").value = ""
  form.querySelector("#compose-recipients").disabled = false
  form.querySelector("#compose-subject").value = ""
  form.querySelector("#compose-body").value = ""
}

function send_email(event) {
  // Prevent page refresh
  event.preventDefault()
  // Grab required values from the compose form
  let recipients = document.querySelector("#compose-recipients").value
  let subject = document.querySelector("#compose-subject").value
  let body = document.querySelector("#compose-body").value

  fetch("/emails", {
    method: "POST",
    body: JSON.stringify({
      recipients,
      subject,
      body,
    }),
  })
    .then(response => response.json())
    .then(result => {
      if ("error" in result) {
        alert(result.error)
      } else {
        load_mailbox("sent")
      }
    })
    .catch(error => {
      alert("Something went wrong")
      console.error(error.message)
    })
}

function load_mailbox(mailbox) {
  let mailboxView = document.querySelector("#mailbox-view")
  // Show the mailbox name
  mailboxView.querySelector("h3").innerText = `${
    mailbox.charAt(0).toUpperCase() + mailbox.slice(1)
  }`
  // Hide other views
  document.querySelector("#compose-view").style.display = "none"
  document.querySelector("#single-email-view").style.display = "none"
  document.querySelector("#empty-mailbox-alert").style.display = "none"
  document.querySelector("#mailbox-content").style.display = "none"

  // Update the mailbox with the latest emails to show for this mailbox
  fetch(`/emails/${mailbox}`)
    .then(response => response.json())
    .then(emails => {
      if (emails.length == 0) {
        document.querySelector("#empty-mailbox-alert").style.display = "block"
      } else {
        document.querySelector("#mailbox-content").style.display = "table"
        let listContent = mailboxView.querySelector("tbody")
        listContent.innerHTML = ""
        emails.forEach(email => {
          let row = document.createElement("tr")
          if (!email.read) {
            row.classList.add("unread")
          }
          row.innerHTML = `<td>${email.sender}</td>
                        <td class="email-subject">${email.subject}</td>
                        <td>${email.timestamp}</td>`

          listContent.append(row)

          row.addEventListener("click", e => {
            view_email(email, mailbox)
          })
        })
      }
    })

  // Show the mailbox
  mailboxView.style.display = "block"
}

function view_email(email, mailbox) {
  // Hide other views
  document.getElementById("compose-view").style.display = "none"
  document.getElementById("mailbox-view").style.display = "none"

  // Show single email view
  let emailView = document.getElementById("single-email-view")
  emailView.style.display = "block"
  emailView.querySelector("h3").textContent = `${
    mailbox.charAt(0).toUpperCase() + mailbox.slice(1)
  }`

  // Manage visibility of Archive button depending on the specific mailbox
  let archiveButton = document.querySelector("#archive-button")
  archiveButton.style.display = mailbox === "sent" ? "none" : "block"

  // Populate email view fields with the required content
  fetch(`/emails/${email.id}`)
    .then(response => response.json())
    .then(email => {
      document.querySelector("#email-subject span").textContent = email.subject
      document.querySelector("#email-sender span").textContent = email.sender
      document.querySelector("#email-recepients span").textContent =
        email.recipients
      document.querySelector("#email-timestamp span").textContent =
        email.timestamp

      document.querySelector("#single-email-view div.reply-text").innerText =
        email.body
    })

  // Mark email as read
  if (!email.read) {
    fetch(`/emails/${email.id}`, {
      method: "PUT",
      body: JSON.stringify({
        read: true,
      }),
    })
  }

  let replyButton = document.getElementById("reply-button")
  replyButton.addEventListener("click", () => reply(email))

  // Change the text of Archive button depending on the specific mailbox
  archiveButton.textContent = mailbox === "archive" ? "Unarchive" : "Archive"

  archiveButton.onclick = () => {
    archive(email.id, email.archived)
  }
}

function reply(email) {
  // Hide email view and show compose form
  document.getElementById("single-email-view").style.display = "none"
  let form = document.querySelector("#compose-view")
  form.style.display = "block"
  // Change the form title
  form.querySelector("h3").textContent = "Reply"

  fetch(`/emails/${email.id}`)
    .then(response => response.json())
    .then(email => {
      // Pre-fill fields with the email details
      document.querySelector("#compose-recipients").value = email.sender
      document.querySelector("#compose-subject").value =
        email.subject.startsWith("Re:") ? email.subject : `Re: ${email.subject}`
      document.querySelector("#compose-recipients").disabled = true
      // Pre-fill body field with a line like "On Jan 1 2020, 12:00 AM foo@example.com wrote:"
      document.querySelector("#compose-body").value =
        `\n\n ...\nOn ${email.timestamp} ${email.sender} wrote:\n` +
        email.body.replace(/^/gm, "  ")
    })
}

function archive(id, archived) {
  fetch(`/emails/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      archived: !archived,
    }),
  }).then(() => load_mailbox("inbox"))
}
