.PHONY: build push run-docker run deploy clean clean-workers push-latest-tag hailjwt

NOTEBOOK2_LATEST = gcr.io/$(PROJECT)/notebook2:latest

hailjwt:
	cp -rf ../hailjwt ./

build: hailjwt
	make -C ../docker build
	-docker pull $(BATCH_LATEST)
	python3 ../ci2/jinja2_render.py '{"base_image":{"image":"base"}}' Dockerfile Dockerfile.out
	docker build -t notebook2 -f Dockerfile.out --cache-from notebook2,$(NOTEBOOK2_LATEST),base ..

push: IMAGE = gcr.io/$(PROJECT)/notebook2:$(shell docker images -q --no-trunc notebook2 | sed -e 's,[^:]*:,,')
push: build $(PUSHED)
	docker tag notebook2 $(IMAGE)
	docker push $(IMAGE)
	echo $(IMAGE) > notebook-image

push-latest-tag: IMAGE = gcr.io/$(PROJECT)/notebook2:latest
push-latest-tag: build
	docker tag notebook2 $(IMAGE)
	docker push $(IMAGE)

push-all-latest-tag: push-latest-tag $(PUSHED_LATEST_TAG)

run-docker: build
	docker run -i -p 5000:5000 -t notebook2

run:
	python notebook/notebook.py

deploy: push
	sed -e "s,@sha@,$(shell git rev-parse --short=12 HEAD)," \
	  -e "s,@image@,$(shell cat notebook-image)," \
	  < deployment.yaml.in > deployment.yaml
	kubectl -n default apply -f deployment.yaml

clean-workers:
	kubectl delete pods -l app=notebook2-worker
	kubectl delete services -l app=notebook2-worker

clean:
	rm -rf build
	rm notebook-worker-images
