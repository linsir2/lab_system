package com.lab.gateway.person.service;

import com.lab.gateway.common.BusinessException;
import com.lab.gateway.common.enums.PersonRole;
import com.lab.gateway.common.enums.PersonStatus;
import com.lab.gateway.person.dto.PersonRequest;
import com.lab.gateway.person.entity.Person;
import com.lab.gateway.person.repository.PersonRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class PersonService {

    private final PersonRepository repository;

    public PersonService(PersonRepository repository) {
        this.repository = repository;
    }

    public List<Person> list(PersonRole role, PersonStatus status) {
        if (role != null && status != null) {
            return repository.findByRoleAndStatus(role, status);
        }
        if (role != null) {
            return repository.findByRole(role);
        }
        if (status != null) {
            return repository.findByStatus(status);
        }
        return repository.findAll();
    }

    public Person get(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "person not found"));
    }

    @Transactional
    public Person create(PersonRequest request) {
        Person person = new Person();
        apply(person, request);
        return repository.save(person);
    }

    @Transactional
    public Person update(Long id, PersonRequest request) {
        Person person = get(id);
        apply(person, request);
        return repository.save(person);
    }

    @Transactional
    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new BusinessException(404, "person not found");
        }
        repository.deleteById(id);
    }

    private void apply(Person person, PersonRequest request) {
        person.setName(request.name());
        person.setRole(request.role());
        person.setStatus(request.status());
    }
}
