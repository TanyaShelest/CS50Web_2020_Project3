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
  document.querySelector("#mailbox-view").style.display = "none"
  document.querySelector("#compose-view").style.display = "block"

  // Clear out composition fields
  document.querySelector("#compose-recipients").value = ""
  document.querySelector("#compose-subject").value = ""
  document.querySelector("#compose-body").value = ""
}

function send_email(e) {
  e.preventDefault()
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
    .then((response) => response.json())
    .then((result) => {
      if ("error" in result) {
        alert(result.error)
      } else {
        load_mailbox("sent")
      }
    })
}

function load_mailbox(mailbox) {
  let mailboxView = document.querySelector("#mailbox-view")
  mailboxView.style.display = "block"
  // // Show the mailbox name
  mailboxView.querySelector("h3").innerText = `${
    mailbox.charAt(0).toUpperCase() + mailbox.slice(1)
  }`
  // Show the mailbox and hide other views
  document.querySelector("#compose-view").style.display = "none"
  document.querySelector("#single-email-view").style.display = "none"
  document.querySelector("#empty-mailbox-alert").style.display = "none"
  document.querySelector("#mailbox-content").style.display = "none"

  // Update the mailbox with the latest emails to show for this mailbox.
  fetch(`/emails/${mailbox}`)
    .then((response) => response.json())
    .then((emails) => {
      if (emails.length == 0) {
        document.querySelector("#empty-mailbox-alert").style.display = "block"
      } else {
        document.querySelector("#mailbox-content").style.display = "table"
        let listContent = mailboxView.querySelector("tbody")
        listContent.innerHTML = ""
        emails.forEach((email) => {
          let row = document.createElement("tr")
          if (!email.read) {
            row.classList.add("unread")
          }
          row.innerHTML = `<td>${email.sender}</td>
                        <td class="email-subject">${email.subject}</td>
                        <td>${email.timestamp}</td>`

          listContent.append(row)

          row.addEventListener("click", (e) => {
            view_email(email, mailbox)
          })
        })
      }
    })
}

function view_email(email, mailbox) {
  document.getElementById("compose-view").style.display = "none"
  document.getElementById("mailbox-view").style.display = "none"

  let emailView = document.getElementById("single-email-view")
  emailView.style.display = "block"
  emailView.insertAdjacentHTML(
    "afterbegin",
    `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`
  )
  let archiveButton = document.getElementById("archive-button")

  if (mailbox === "sent") {
    archiveButton.style.display = "none"
  }

  fetch(`/emails/${email.id}`)
    .then((response) => response.json())
    .then((email) => {
      document.querySelector("#email-subject span").textContent = email.subject
      document.querySelector("#email-sender span").textContent = email.sender
      document.querySelector("#email-recepients span").textContent =
        email.recipients
      document.querySelector("#email-timestamp span").textContent =
        email.timestamp

      document.querySelector("#single-email-view div.reply-text").innerText =
        email.body
    })

  fetch(`/emails/${email.id}`, {
    method: "PUT",
    body: JSON.stringify({
      read: true,
    }),
  })

  let replyButton = document.getElementById("reply-button")
  replyButton.addEventListener("click", () => reply(email))

  // archiveButton.textContent = mailbox === "archive" ? "Unarchive" : "Archive"
  archiveButton.textContent = email.archived ? "Unarchive" : "Archive"

  archiveButton.addEventListener("click", () =>
    archive(email.id, email.archived)
  )
}

function reply(email) {
  document.getElementById("single-email-view").style.display = "none"

  let form = document.querySelector("#compose-view")
  form.style.display = "block"
  form.querySelector("h3").textContent = "Reply"

  fetch(`/emails/${email.id}`)
    .then((response) => response.json())
    .then((email) => {
      document.querySelector("#compose-recipients").value = email.sender
      document.querySelector("#compose-subject").value =
        email.subject.startsWith("Re:") ? email.subject : `Re: ${email.subject}`
      document.querySelector("#compose-recipients").disabled = true
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
  }).then(location.reload())
}
