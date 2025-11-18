import { Component } from "@angular/core"
import { FormBuilder, FormGroup, Validators } from "@angular/forms"
import { ContactService } from "src/app/core/services/contact.service"
import { ToastrService } from "ngx-toastr"

@Component({
  selector: "app-contact",
  templateUrl: "./contact.component.html",
  styleUrls: ["./contact.component.css"],
})
export class ContactComponent {
  contactForm: FormGroup
  isSubmitting = false
  status: "idle" | "success" | "error" = "idle"
  serverError = ""

  constructor(
    private formBuilder: FormBuilder,
    private contactService: ContactService,
    private toastr: ToastrService
  ) {
    this.contactForm = this.formBuilder.group({
      fullName: ["", [Validators.required, Validators.minLength(2)]],
      email: ["", [Validators.required, Validators.email]],
      subject: ["", [Validators.required, Validators.minLength(5)]],
      message: ["", [Validators.required, Validators.minLength(10)]],
    })
  }

  onSubmit(): void {
    if (this.contactForm.valid) {
      this.isSubmitting = true

      const formData = this.contactForm.value

      this.status = "idle"
      this.serverError = ""

      this.contactService.submit(formData).subscribe({
        next: () => {
          this.isSubmitting = false
          this.status = "success"
          this.contactForm.reset()
          this.toastr.success("Message sent successfully!")
        },
        error: (err) => {
          this.isSubmitting = false
          this.status = "error"
          this.serverError = err?.error?.message || "Unable to send your message. Please try again."
          this.toastr.error(this.serverError)
        },
      })
    } else {
      Object.keys(this.contactForm.controls).forEach((key) => {
        this.contactForm.get(key)?.markAsTouched()
      })
    }
  }

  // Getter methods for easy access to form controls in template
  get fullName() {
    return this.contactForm.get("fullName")
  }
  get email() {
    return this.contactForm.get("email")
  }
  get subject() {
    return this.contactForm.get("subject")
  }
  get message() {
    return this.contactForm.get("message")
  }
}
