# GraphQL

We ship a lightweight GraphQL endpoint dedicated to teachers. Once the full schema is complete this file will outline all queries/mutations, but for now:

## `getTeacherClasses` Query

- **Endpoint:** `POST /graphql`
- **Auth:** `Authorization: Bearer <JWT>` (role **must** be TEACHER)
- **Query:**

```graphql
query GetTeacherClasses {
  getTeacherClasses {
    totalClasses
    classes {
      name
      grade {
        id
        name
        numericLevel
      }
      academic_year
      subject
      homeroom_teacher
    }
  }
}
```

### Sample Response

```json
{
  "data": {
    "getTeacherClasses": {
      "totalClasses": 2,
      "classes": [
        {
          "name": "9A",
          "grade": {
            "id": 3,
            "name": "Grade 9",
            "numericLevel": 9
          },
          "academic_year": "2024-2025",
          "subject": "Mathematics",
          "homeroom_teacher": true
        },
        {
          "name": "9B",
          "grade": null,
          "academic_year": "2024-2025",
          "subject": "Mathematics",
          "homeroom_teacher": false
        }
      ]
    }
  }
}
```

### Notes

- The endpoint is mounted through `express-graphql`, so GraphiQL is available in development.
- The GraphQL context contains `prisma` and the authenticated `user` (provided by `roleMiddleware`), allowing resolvers to infer the teacher from the JWT without extra params.