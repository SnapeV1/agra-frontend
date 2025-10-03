import { Component, type OnInit } from "@angular/core"
import { FormBuilder, FormGroup, Validators } from "@angular/forms"

@Component({
  selector: "app-contact",
  templateUrl: "./contact.component.html",
  styleUrls: ["./contact.component.css"],
})
export class ContactComponent implements OnInit {
  contactForm: FormGroup
  isSubmitting = false

  constructor(private formBuilder: FormBuilder) {
    this.contactForm = this.formBuilder.group({
      name: ["", [Validators.required, Validators.minLength(2)]],
      email: ["", [Validators.required, Validators.email]],
      subject: ["", [Validators.required, Validators.minLength(5)]],
      message: ["", [Validators.required, Validators.minLength(10)]],
    })
  }

  ngOnInit(): void {
    // Component initialization logic
  }

  onSubmit(): void {
    if (this.contactForm.valid) {
      this.isSubmitting = true

      // Simulate form submission
      const formData = this.contactForm.value
  

      // Here you would typically send the data to your backend service
      // this.contactService.submitForm(formData).subscribe(...)

      // Simulate API call delay
      setTimeout(() => {
        this.isSubmitting = false
        alert("Message sent successfully!")
        this.contactForm.reset()
      }, 2000)
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.contactForm.controls).forEach((key) => {
        this.contactForm.get(key)?.markAsTouched()
      })
    }
  }

  // Getter methods for easy access to form controls in template
  get name() {
    return this.contactForm.get("name")
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
